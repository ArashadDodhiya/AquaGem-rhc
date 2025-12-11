import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';
import Route from '@/models/Route';

/**
 * GET /api/admin/deliveries/[id]
 * Get single delivery details with full information
 */
export async function GET(request, { params }) {
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

        const { id } = params;

        // Fetch delivery with populated references
        const delivery = await Delivery.findById(id)
            .populate({
                path: 'customer_id',
                select: 'name mobile whatsapp is_active created_at'
            })
            .populate({
                path: 'delivery_boy_id',
                select: 'name mobile whatsapp is_active created_at'
            })
            .lean();

        if (!delivery) {
            return NextResponse.json(
                { success: false, message: 'Delivery not found' },
                { status: 404 }
            );
        }

        // Get customer profile with route information
        const customerProfile = await CustomerProfile.findOne({
            user_id: delivery.customer_id._id
        })
            .populate('route_id', 'route_name areas assigned_delivery_boy')
            .lean();

        // Get route details if exists
        let routeDetails = null;
        if (customerProfile?.route_id) {
            routeDetails = {
                _id: customerProfile.route_id._id,
                route_name: customerProfile.route_id.route_name,
                areas: customerProfile.route_id.areas || [],
                assigned_delivery_boy: customerProfile.route_id.assigned_delivery_boy
            };

            // If route has assigned delivery boy, get their details
            if (routeDetails.assigned_delivery_boy) {
                const assignedBoy = await User.findById(routeDetails.assigned_delivery_boy)
                    .select('name mobile')
                    .lean();
                routeDetails.assigned_delivery_boy_details = assignedBoy;
            }
        }

        // Build comprehensive response
        const detailedDelivery = {
            _id: delivery._id,
            date: delivery.date,

            // Customer information
            customer: {
                _id: delivery.customer_id._id,
                name: delivery.customer_id.name,
                mobile: delivery.customer_id.mobile,
                whatsapp: delivery.customer_id.whatsapp,
                is_active: delivery.customer_id.is_active,
                created_at: delivery.customer_id.created_at,

                // Profile information
                address: customerProfile?.address || {},
                delivery_schedule: customerProfile?.delivery_schedule || null,
                security_deposit: customerProfile?.security_deposit || 0,
                jar_balance: customerProfile?.jar_balance || 0,
                delivery_instructions: customerProfile?.delivery_instructions || null
            },

            // Delivery boy information
            delivery_boy: {
                _id: delivery.delivery_boy_id._id,
                name: delivery.delivery_boy_id.name,
                mobile: delivery.delivery_boy_id.mobile,
                whatsapp: delivery.delivery_boy_id.whatsapp,
                is_active: delivery.delivery_boy_id.is_active,
                created_at: delivery.delivery_boy_id.created_at
            },

            // Route information
            route: routeDetails,

            // Delivery details
            delivered_qty: delivery.delivered_qty,
            returned_qty: delivery.returned_qty,
            net_jars: delivery.delivered_qty - delivery.returned_qty,
            status: delivery.status,
            notes: delivery.notes,

            // Proof of delivery
            photo_url: delivery.photo_url || null,
            signature_url: delivery.signature_url || null,
            gps_location: delivery.gps_location || null,

            // Metadata
            created_at: delivery.created_at
        };

        return NextResponse.json({
            success: true,
            message: 'Delivery details retrieved successfully',
            data: detailedDelivery
        });

    } catch (error) {
        console.error('Error fetching delivery details:', error);

        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            return NextResponse.json(
                { success: false, message: 'Invalid delivery ID format' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Server error fetching delivery details' },
            { status: 500 }
        );
    }
}
