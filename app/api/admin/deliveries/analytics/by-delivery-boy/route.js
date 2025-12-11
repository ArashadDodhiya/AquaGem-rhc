import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/analytics/by-delivery-boy
 * Delivery boy performance: Metrics per delivery boy (completion rate, avg deliveries/day)
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

        // Match stage for date filtering
        const matchStage = {};
        if (date_from || date_to) {
            matchStage.date = {};
            if (date_from) {
                const fromDate = new Date(date_from);
                fromDate.setHours(0, 0, 0, 0);
                matchStage.date.$gte = fromDate;
            }
            if (date_to) {
                const toDate = new Date(date_to);
                toDate.setHours(23, 59, 59, 999);
                matchStage.date.$lte = toDate;
            }
        }

        const pipeline = [
            // 1. Filter by Date
            { $match: matchStage },

            // 2. Group by Delivery Boy
            {
                $group: {
                    _id: "$delivery_boy_id",
                    total_deliveries: { $sum: 1 },
                    delivered_count: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                    },
                    failed_count: {
                        $sum: { $cond: [{ $eq: ["$status", "not_delivered"] }, 1, 0] }
                    },
                    partial_count: {
                        $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] }
                    },
                    total_qty_delivered: { $sum: "$delivered_qty" },
                    total_qty_returned: { $sum: "$returned_qty" },
                    // Collect unique dates to calculate active days
                    active_days: {
                        $addToSet: {
                            $dateToString: { format: "%Y-%m-%d", date: "$date" }
                        }
                    }
                }
            },

            // 3. Lookup User details
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user_info'
                }
            },
            {
                $unwind: {
                    path: '$user_info',
                    preserveNullAndEmptyArrays: true // Keep if user deleted
                }
            },

            // 4. Project and Calculate Metrics
            {
                $project: {
                    delivery_boy_id: "$_id",
                    name: { $ifNull: ["$user_info.name", "Unknown"] },
                    mobile: "$user_info.mobile",
                    total_deliveries: 1,
                    delivered_count: 1,
                    failed_count: 1,
                    completion_rate: {
                        $cond: [
                            { $eq: ["$total_deliveries", 0] },
                            0,
                            {
                                $multiply: [
                                    { $divide: ["$delivered_count", "$total_deliveries"] },
                                    100
                                ]
                            }
                        ]
                    },
                    days_active: { $size: "$active_days" },
                    avg_deliveries_per_day: {
                        $cond: [
                            { $eq: [{ $size: "$active_days" }, 0] },
                            0,
                            { $divide: ["$total_deliveries", { $size: "$active_days" }] }
                        ]
                    },
                    total_qty_delivered: 1,
                    _id: 0
                }
            },

            // 5. Sort by completion rate desc
            { $sort: { completion_rate: -1, total_deliveries: -1 } }
        ];

        const boyStats = await Delivery.aggregate(pipeline);

        return NextResponse.json({
            success: true,
            data: boyStats,
            filters: {
                date_from,
                date_to
            }
        });

    } catch (error) {
        console.error('Error fetching delivery boy analytics:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching delivery boy analytics' },
            { status: 500 }
        );
    }
}
