import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import Route from '@/models/Route';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/analytics/by-route
 * Route-wise delivery performance: Deliveries grouped by route with success rates
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

            // 2. Lookup Customer Profile to get Route ID
            // Delivery.customer_id refers to User._id. CustomerProfile.user_id also refers to User._id
            {
                $lookup: {
                    from: 'customerprofiles', // Collection name (lowercase plural of model name)
                    localField: 'customer_id',
                    foreignField: 'user_id',
                    as: 'profile'
                }
            },
            {
                $unwind: {
                    path: '$profile',
                    preserveNullAndEmptyArrays: true
                }
            },

            // 3. Lookup Route details
            {
                $lookup: {
                    from: 'routes', // Collection name
                    localField: 'profile.route_id',
                    foreignField: '_id',
                    as: 'route_info'
                }
            },
            {
                $unwind: {
                    path: '$route_info',
                    preserveNullAndEmptyArrays: true
                }
            },

            // 4. Group by Route
            {
                $group: {
                    _id: {
                        id: '$route_info._id',
                        name: '$route_info.route_name'
                    },
                    total_deliveries: { $sum: 1 },
                    delivered_count: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                    },
                    failed_count: {
                        $sum: { $cond: [{ $eq: ["$status", "not_delivered"] }, 1, 0] }
                    },
                    total_delivered_qty: { $sum: "$delivered_qty" },
                    total_returned_qty: { $sum: "$returned_qty" }
                }
            },

            // 5. Project and Format
            {
                $project: {
                    route_id: "$_id.id",
                    route_name: { $ifNull: ["$_id.name", "Unassigned"] },
                    total_deliveries: 1,
                    delivered_count: 1,
                    failed_count: 1,
                    total_delivered_qty: 1,
                    success_rate: {
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
                    _id: 0
                }
            },

            // 6. Sort by total deliveries descending
            { $sort: { total_deliveries: -1 } }
        ];

        const routeStats = await Delivery.aggregate(pipeline);

        return NextResponse.json({
            success: true,
            data: routeStats,
            filters: {
                date_from,
                date_to
            }
        });

    } catch (error) {
        console.error('Error fetching route analytics:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching route analytics' },
            { status: 500 }
        );
    }
}
