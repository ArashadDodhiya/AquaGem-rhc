import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/delivery-boys/[id]/deliveries
 * Get delivery history for a specific delivery boy
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

        // Verify delivery boy exists
        const deliveryBoy = await User.findById(id);
        if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(request.url);
        const date_from = searchParams.get('date_from');
        const date_to = searchParams.get('date_to');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const query = { delivery_boy_id: id };

        // Date range filter
        if (date_from || date_to) {
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

        // Status filter
        if (status) {
            query.status = status;
        }

        // Get total for pagination
        const total = await Delivery.countDocuments(query);

        // Fetch deliveries
        const deliveries = await Delivery.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customer_id', 'name mobile address')
            .lean();

        // Format data
        const formattedDeliveries = deliveries.map(d => ({
            _id: d._id,
            date: d.date,
            customer: {
                _id: d.customer_id?._id,
                name: d.customer_id?.name,
                mobile: d.customer_id?.mobile
            },
            status: d.status,
            delivered_qty: d.delivered_qty,
            returned_qty: d.returned_qty,
            notes: d.notes,
            created_at: d.created_at
        }));

        return NextResponse.json({
            success: true,
            data: formattedDeliveries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching delivery boy history:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching delivery history' },
            { status: 500 }
        );
    }
}
