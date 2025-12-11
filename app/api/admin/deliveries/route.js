import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';
import Route from '@/models/Route';

// Force dynamic since we read query params
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries
 * List all deliveries with filters and pagination
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check for admin role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Filter params
        const date = searchParams.get('date');
        const customer_id = searchParams.get('customer_id');
        const delivery_boy_id = searchParams.get('delivery_boy_id');
        const status = searchParams.get('status');
        const route_id = searchParams.get('route_id');
        const date_from = searchParams.get('date_from');
        const date_to = searchParams.get('date_to');

        // Build query
        const query = {};

        // Date filters
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        } else if (date_from || date_to) {
            query.date = {};
            if (date_from) {
                const fromDate = new Date(date_from);
                fromDate.setHours(0, 0, 0, 0);
                query.date.$gte = fromDate;
            }
            if (date_to) {
                const toDate = new Date(date_to);
                toDate.setHours(23, 59, 59, 999);
                query.date.$lte = toDate;
            }
        }

        // Direct filters
        if (customer_id) query.customer_id = customer_id;
        if (delivery_boy_id) query.delivery_boy_id = delivery_boy_id;
        if (status) query.status = status;

        // If route_id filter is provided, we need to find customers on that route first
        let customerIdsOnRoute = null;
        if (route_id) {
            const customersOnRoute = await CustomerProfile.find({ route_id }).select('user_id').lean();
            customerIdsOnRoute = customersOnRoute.map(c => c.user_id);

            // If customer_id filter already exists, intersect with route customers
            if (query.customer_id) {
                if (!customerIdsOnRoute.some(id => id.toString() === query.customer_id)) {
                    // Customer not on this route, return empty
                    return NextResponse.json({
                        success: true,
                        message: 'Deliveries retrieved successfully',
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            totalPages: 0
                        }
                    });
                }
            } else {
                query.customer_id = { $in: customerIdsOnRoute };
            }
        }

        // Get total count for pagination
        const total = await Delivery.countDocuments(query);

        // Fetch deliveries with population
        const deliveries = await Delivery.find(query)
            .sort({ date: -1, created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'customer_id',
                select: 'name mobile whatsapp is_active'
            })
            .populate({
                path: 'delivery_boy_id',
                select: 'name mobile is_active'
            })
            .lean();

        // Enrich with customer profile and route data
        const enrichedDeliveries = await Promise.all(
            deliveries.map(async (delivery) => {
                // Get customer profile
                const customerProfile = await CustomerProfile.findOne({
                    user_id: delivery.customer_id?._id
                })
                    .populate('route_id', 'route_name areas')
                    .lean();

                return {
                    _id: delivery._id,
                    date: delivery.date,
                    customer: {
                        _id: delivery.customer_id?._id,
                        name: delivery.customer_id?.name,
                        mobile: delivery.customer_id?.mobile,
                        whatsapp: delivery.customer_id?.whatsapp,
                        is_active: delivery.customer_id?.is_active,
                        address: customerProfile?.address || {},
                        route: customerProfile?.route_id || null
                    },
                    delivery_boy: {
                        _id: delivery.delivery_boy_id?._id,
                        name: delivery.delivery_boy_id?.name,
                        mobile: delivery.delivery_boy_id?.mobile,
                        is_active: delivery.delivery_boy_id?.is_active
                    },
                    delivered_qty: delivery.delivered_qty,
                    returned_qty: delivery.returned_qty,
                    status: delivery.status,
                    notes: delivery.notes,
                    has_photo: !!delivery.photo_url,
                    has_signature: !!delivery.signature_url,
                    has_gps: !!delivery.gps_location,
                    created_at: delivery.created_at
                };
            })
        );

        return NextResponse.json({
            success: true,
            message: 'Deliveries retrieved successfully',
            data: enrichedDeliveries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching deliveries:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching deliveries' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/deliveries
 * Create new delivery record (manual entry)
 */
export async function POST(request) {
    try {
        await connectDB();

        // Check for admin role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            customer_id,
            delivery_boy_id,
            date,
            delivered_qty,
            returned_qty,
            status,
            notes,
            photo_url,
            signature_url,
            gps_location
        } = body;

        // Validate required fields
        if (!customer_id || !delivery_boy_id || !date ||
            delivered_qty === undefined || returned_qty === undefined || !status) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Missing required fields: customer_id, delivery_boy_id, date, delivered_qty, returned_qty, status'
                },
                { status: 400 }
            );
        }

        // Validate status enum
        const validStatuses = ['delivered', 'not_delivered', 'partial'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                },
                { status: 400 }
            );
        }

        // Validate quantities
        if (delivered_qty < 0 || returned_qty < 0) {
            return NextResponse.json(
                { success: false, message: 'Quantities cannot be negative' },
                { status: 400 }
            );
        }

        // Validate customer exists and is a customer
        const customer = await User.findById(customer_id);
        if (!customer || customer.role !== 'customer') {
            return NextResponse.json(
                { success: false, message: 'Invalid customer_id or customer not found' },
                { status: 400 }
            );
        }

        // Validate delivery boy exists and is a delivery_boy
        const deliveryBoy = await User.findById(delivery_boy_id);
        if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Invalid delivery_boy_id or delivery boy not found' },
                { status: 400 }
            );
        }

        // Create delivery record
        const delivery = new Delivery({
            customer_id,
            delivery_boy_id,
            date: new Date(date),
            delivered_qty,
            returned_qty,
            status,
            notes: notes || undefined,
            photo_url: photo_url || undefined,
            signature_url: signature_url || undefined,
            gps_location: gps_location || undefined
        });

        await delivery.save();

        // Update customer jar balance
        const netJars = delivered_qty - returned_qty;
        if (netJars !== 0) {
            await CustomerProfile.findOneAndUpdate(
                { user_id: customer_id },
                { $inc: { jar_balance: netJars } }
            );
        }

        // Populate the created delivery for response
        const populatedDelivery = await Delivery.findById(delivery._id)
            .populate('customer_id', 'name mobile whatsapp')
            .populate('delivery_boy_id', 'name mobile')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Delivery record created successfully',
            data: populatedDelivery
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating delivery:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Server error creating delivery' },
            { status: 500 }
        );
    }
}
