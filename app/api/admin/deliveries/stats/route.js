import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import CustomerProfile from '@/models/CustomerProfile';

// Force dynamic since we read query params
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/stats
 * Get delivery statistics with filters
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

        // Filter params
        const date_from = searchParams.get('date_from');
        const date_to = searchParams.get('date_to');
        const route_id = searchParams.get('route_id');
        const delivery_boy_id = searchParams.get('delivery_boy_id');

        // Build query
        const query = {};

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

        // Delivery boy filter
        if (delivery_boy_id) {
            query.delivery_boy_id = delivery_boy_id;
        }

        // Route filter - need to find customers on that route
        if (route_id) {
            const customersOnRoute = await CustomerProfile.find({ route_id })
                .select('user_id')
                .lean();
            const customerIds = customersOnRoute.map(c => c.user_id);
            query.customer_id = { $in: customerIds };
        }

        // Aggregate statistics
        const stats = await Delivery.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total_deliveries: { $sum: 1 },
                    delivered_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                    },
                    partial_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
                    },
                    failed_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'not_delivered'] }, 1, 0] }
                    },
                    total_delivered_qty: { $sum: '$delivered_qty' },
                    total_returned_qty: { $sum: '$returned_qty' },
                    avg_delivered_qty: { $avg: '$delivered_qty' },
                    avg_returned_qty: { $avg: '$returned_qty' }
                }
            }
        ]);

        // If no deliveries found, return zeros
        if (!stats.length) {
            return NextResponse.json({
                success: true,
                message: 'No deliveries found for the given filters',
                data: {
                    total_deliveries: 0,
                    delivered_count: 0,
                    partial_count: 0,
                    failed_count: 0,
                    success_rate: 0,
                    partial_rate: 0,
                    failure_rate: 0,
                    total_delivered_qty: 0,
                    total_returned_qty: 0,
                    net_jars_delivered: 0,
                    avg_delivered_qty: 0,
                    avg_returned_qty: 0
                }
            });
        }

        const result = stats[0];
        const total = result.total_deliveries;

        // Calculate rates
        const success_rate = total > 0 ? ((result.delivered_count / total) * 100).toFixed(2) : 0;
        const partial_rate = total > 0 ? ((result.partial_count / total) * 100).toFixed(2) : 0;
        const failure_rate = total > 0 ? ((result.failed_count / total) * 100).toFixed(2) : 0;

        // Get status breakdown by date (for trend analysis)
        const dailyBreakdown = await Delivery.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        status: '$status'
                    },
                    count: { $sum: 1 },
                    delivered_qty: { $sum: '$delivered_qty' },
                    returned_qty: { $sum: '$returned_qty' }
                }
            },
            { $sort: { '_id.date': -1 } },
            { $limit: 30 } // Last 30 days or entries
        ]);

        // Format daily breakdown
        const dailyStats = {};
        dailyBreakdown.forEach(item => {
            const date = item._id.date;
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    date,
                    delivered: 0,
                    partial: 0,
                    not_delivered: 0,
                    total_delivered_qty: 0,
                    total_returned_qty: 0
                };
            }
            dailyStats[date][item._id.status] = item.count;
            dailyStats[date].total_delivered_qty += item.delivered_qty;
            dailyStats[date].total_returned_qty += item.returned_qty;
        });

        return NextResponse.json({
            success: true,
            message: 'Delivery statistics retrieved successfully',
            data: {
                // Overall statistics
                total_deliveries: result.total_deliveries,
                delivered_count: result.delivered_count,
                partial_count: result.partial_count,
                failed_count: result.failed_count,

                // Rates (percentages)
                success_rate: parseFloat(success_rate),
                partial_rate: parseFloat(partial_rate),
                failure_rate: parseFloat(failure_rate),

                // Quantity statistics
                total_delivered_qty: result.total_delivered_qty,
                total_returned_qty: result.total_returned_qty,
                net_jars_delivered: result.total_delivered_qty - result.total_returned_qty,
                avg_delivered_qty: parseFloat(result.avg_delivered_qty.toFixed(2)),
                avg_returned_qty: parseFloat(result.avg_returned_qty.toFixed(2)),

                // Daily breakdown
                daily_breakdown: Object.values(dailyStats)
            },
            filters_applied: {
                date_from: date_from || null,
                date_to: date_to || null,
                route_id: route_id || null,
                delivery_boy_id: delivery_boy_id || null
            }
        });

    } catch (error) {
        console.error('Error fetching delivery statistics:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching statistics' },
            { status: 500 }
        );
    }
}
