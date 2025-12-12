import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/undelivered
 * Get all undelivered/failed/partial deliveries
 * Query params: date_from, date_to
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
        const date_from = searchParams.get('date_from');
        const date_to = searchParams.get('date_to');

        const query = {
            status: { $in: ['not_delivered', 'partial'] }
        };

        // Date Filter
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

        // Fetch
        const deliveries = await Delivery.find(query)
            .sort({ date: -1 })
            .populate({
                path: 'customer_id',
                select: 'user_id address',
                populate: { path: 'user_id', select: 'name mobile' }
            })
            .populate('delivery_boy_id', 'name mobile')
            .lean();

        // Transform
        const data = deliveries.map(d => ({
            _id: d._id,
            date: d.date,
            status: d.status,
            customer: {
                _id: d.customer_id?.user_id?._id,
                name: d.customer_id?.user_id?.name || 'Unknown',
                mobile: d.customer_id?.user_id?.mobile || 'N/A',
                address: d.customer_id?.address ?
                    `${d.customer_id.address.flat || ''}, ${d.customer_id.address.building || ''}, ${d.customer_id.address.area || ''}`.replace(/^, /, '').trim()
                    : 'N/A',
                area: d.customer_id?.address?.area || 'N/A'
            },
            delivery_boy: {
                name: d.delivery_boy_id?.name || 'Unknown'
            },
            notes: d.notes, // Important for failed deliveries
            delivered_qty: d.delivered_qty,
            returned_qty: d.returned_qty
        }));

        return NextResponse.json({
            success: true,
            data,
            meta: {
                total: data.length,
                count_failed: data.filter(d => d.status === 'not_delivered').length,
                count_partial: data.filter(d => d.status === 'partial').length
            }
        });

    } catch (error) {
        console.error('Error fetching undelivered tasks:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching undelivered tasks' },
            { status: 500 }
        );
    }
}
