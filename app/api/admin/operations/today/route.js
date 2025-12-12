import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/today
 * Today's delivery overview: Total scheduled, completed, pending, failed
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

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = days[today.getDay()];

        // 1. Get Actual Counts (Completed/Failed/Partial)
        const statsPipeline = [
            {
                $match: {
                    date: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    completed: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
                    },
                    failed: {
                        $sum: { $cond: [{ $eq: ["$status", "not_delivered"] }, 1, 0] }
                    },
                    partial: {
                        $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] }
                    },
                    total_attempted: { $sum: 1 }
                }
            }
        ];
        const actuals = (await Delivery.aggregate(statsPipeline))[0] || {
            completed: 0, failed: 0, partial: 0, total_attempted: 0
        };

        // 2. Get Total Scheduled (Plan)
        // Similar strict logic as dashboard
        const activeCustomers = await CustomerProfile.find({ is_active: true })
            .select('delivery_schedule')
            .lean();

        let totalScheduled = 0;
        activeCustomers.forEach(c => {
            const s = c.delivery_schedule;
            if (!s || s.type === 'daily') totalScheduled++;
            else if (s.type === 'custom' && s.custom_days?.includes(currentDay)) totalScheduled++;
            else if (s.type === 'alternate') totalScheduled++;
        });

        // 3. Calculate Pending
        const pending = Math.max(0, totalScheduled - actuals.total_attempted);

        return NextResponse.json({
            success: true,
            data: {
                total_scheduled: totalScheduled,
                completed: actuals.completed,
                pending: pending,
                failed: actuals.failed,
                partial: actuals.partial,
                total_attempted: actuals.total_attempted
            }
        });

    } catch (error) {
        console.error('Error fetching today\'s operations overview:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching operations overview' },
            { status: 500 }
        );
    }
}
