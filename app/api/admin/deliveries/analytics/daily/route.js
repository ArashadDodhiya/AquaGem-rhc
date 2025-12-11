import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/analytics/daily
 * Daily delivery analytics: Trends by date, status breakdown, quantity trends
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
        const days = parseInt(searchParams.get('days') || '30'); // Default last 30 days
        
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        dateLimit.setHours(0, 0, 0, 0);

        const pipeline = [
            {
                $match: {
                    date: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    total_deliveries: { $sum: 1 },
                    delivered_count: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                    },
                    partial_count: {
                        $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] }
                    },
                    failed_count: {
                        $sum: { $cond: [{ $eq: ["$status", "not_delivered"] }, 1, 0] }
                    },
                    total_delivered_qty: { $sum: "$delivered_qty" },
                    total_returned_qty: { $sum: "$returned_qty" }
                }
            },
            {
                $sort: { "_id": -1 } // Most recent first
            },
            {
                $project: {
                    date: "$_id",
                    total_deliveries: 1,
                    delivered_count: 1,
                    partial_count: 1,
                    failed_count: 1,
                    total_delivered_qty: 1,
                    total_returned_qty: 1,
                    success_rate: {
                        $multiply: [
                            { $divide: ["$delivered_count", "$total_deliveries"] },
                            100
                        ]
                    },
                    net_jars: { $subtract: ["$total_delivered_qty", "$total_returned_qty"] },
                    _id: 0
                }
            }
        ];

        const dailyStats = await Delivery.aggregate(pipeline);

        return NextResponse.json({
            success: true,
            data: dailyStats,
            meta: {
                days_analyzed: days,
                count: dailyStats.length
            }
        });

    } catch (error) {
        console.error('Error fetching daily analytics:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching daily analytics' },
            { status: 500 }
        );
    }
}
