import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/delivery-boys/[id]/performance
 * Get performance metrics for a specific delivery boy
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

        // Verify ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid ID format' },
                { status: 400 }
            );
        }

        // Verify delivery boy exists
        const deliveryBoy = await User.findById(id);
        if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        // Aggregate metrics
        const pipeline = [
            { $match: { delivery_boy_id: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
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
                    total_qty: { $sum: "$delivered_qty" },
                    // Collect unique dates
                    active_days: {
                        $addToSet: {
                            $dateToString: { format: "%Y-%m-%d", date: "$date" }
                        }
                    },
                    // Collect recent feedback (notes from failed/partial deliveries)
                    feedback_notes: {
                        $push: {
                            $cond: [
                                { $in: ["$status", ["not_delivered", "partial"]] },
                                { date: "$date", note: "$notes", status: "$status" },
                                "$$REMOVE"
                            ]
                        }
                    }
                }
            }
        ];

        const stats = await Delivery.aggregate(pipeline);

        if (!stats.length) {
            return NextResponse.json({
                success: true,
                data: {
                    delivery_boy: { name: deliveryBoy.name },
                    total_deliveries: 0,
                    success_rate: 0,
                    avg_deliveries_per_day: 0,
                    total_delivered_qty: 0,
                    customer_feedback: []
                }
            });
        }

        const result = stats[0];
        const daysActive = result.active_days.length;

        const data = {
            delivery_boy: {
                _id: deliveryBoy._id,
                name: deliveryBoy.name,
                mobile: deliveryBoy.mobile
            },
            total_deliveries: result.total_deliveries,
            delivered_count: result.delivered_count,
            failed_count: result.failed_count,
            success_rate: result.total_deliveries > 0
                ? parseFloat(((result.delivered_count / result.total_deliveries) * 100).toFixed(2))
                : 0,
            avg_deliveries_per_day: daysActive > 0
                ? parseFloat((result.total_deliveries / daysActive).toFixed(1))
                : 0,
            total_delivered_qty: result.total_qty,
            // Return last 5 feedback items
            customer_feedback: result.feedback_notes
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
        };

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching performance metrics' },
            { status: 500 }
        );
    }
}
