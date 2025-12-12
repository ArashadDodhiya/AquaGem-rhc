import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import Route from '@/models/Route';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/dashboard
 * Main operations dashboard: Today's summary, pending deliveries, active delivery boys, route status
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

        // 1. Get Today's Delivery Stats (Actuals)
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
                    total: { $sum: 1 }
                }
            }
        ];

        const actualStats = (await Delivery.aggregate(statsPipeline))[0] || { completed: 0, failed: 0, partial: 0, total: 0 };

        // 2. Calculate Total Scheduled (Plan) to determine Pending
        // This is heavy. Optimization: Filter by active customers.
        const allRoutes = await Route.find().lean();
        const allCustomers = await CustomerProfile.find({ is_active: true })
            .select('route_id delivery_schedule')
            .lean();

        let totalScheduled = 0;
        const routeScheduledCounts = {}; // map route_id -> count

        // Initialize counts
        allRoutes.forEach(r => routeScheduledCounts[r._id.toString()] = 0);

        allCustomers.forEach(c => {
            let isScheduled = false;
            const schedule = c.delivery_schedule;

            if (!schedule || schedule.type === 'daily') isScheduled = true;
            else if (schedule.type === 'custom' && schedule.custom_days?.includes(currentDay)) isScheduled = true;
            else if (schedule.type === 'alternate') isScheduled = true; // MVP assumption

            if (isScheduled) {
                totalScheduled++;
                if (c.route_id && routeScheduledCounts[c.route_id.toString()] !== undefined) {
                    routeScheduledCounts[c.route_id.toString()]++;
                }
            }
        });

        // Pending = Scheduled - (Actual Attempts)
        // Note: 'Actual Total' includes failed attempts, which count as "done" for the day's schedule usually.
        // So Pending = Total Scheduled - (Completed + Failed + Partial)
        // Which is: Pending = Total Scheduled - actualStats.total
        const pending = Math.max(0, totalScheduled - actualStats.total);

        // 3. Active Delivery Boys
        // Count Delivery Boys assigned to Routes that have scheduled deliveries
        const activeDeliveryBoysSet = new Set();
        allRoutes.forEach(r => {
            if (routeScheduledCounts[r._id.toString()] > 0 && r.assigned_delivery_boy) {
                activeDeliveryBoysSet.add(r.assigned_delivery_boy.toString());
            }
        });
        const activeDeliveryBoysCount = activeDeliveryBoysSet.size;

        // 4. Route Status Details
        // Get today's deliveries grouped by route to see progress
        const routeProgressPipeline = [
            {
                $match: {
                    date: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            // Lookup to get route via customer
            {
                $lookup: {
                    from: 'customerprofiles',
                    localField: 'customer_id',
                    foreignField: 'user_id',
                    as: 'profile'
                }
            },
            { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$profile.route_id',
                    completed_count: { $sum: 1 } // "Done" count for this route
                }
            }
        ];

        const routeActuals = await Delivery.aggregate(routeProgressPipeline);
        const routeActualMap = {};
        routeActuals.forEach(r => {
            if (r._id) routeActualMap[r._id.toString()] = r.completed_count;
        });

        // Build Route Status Array
        const routeStatus = allRoutes.map(r => {
            const scheduled = routeScheduledCounts[r._id.toString()] || 0;
            const completed = routeActualMap[r._id.toString()] || 0;
            const pending = Math.max(0, scheduled - completed);
            const percentage = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

            return {
                _id: r._id,
                name: r.route_name,
                assigned_delivery_boy: r.assigned_delivery_boy, // simple ID
                scheduled,
                completed,
                pending,
                percentage
            };
        }).filter(r => r.scheduled > 0) // Only show active routes
            .sort((a, b) => b.pending - a.pending); // Sort by most pending

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    total_scheduled: totalScheduled,
                    completed: actualStats.completed,
                    failed: actualStats.failed,
                    partial: actualStats.partial,
                    pending: pending,
                    total_attempted: actualStats.total
                },
                active_delivery_boys: activeDeliveryBoysCount,
                route_status: routeStatus
            }
        });

    } catch (error) {
        console.error('Error fetching operations dashboard:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching dashboard' },
            { status: 500 }
        );
    }
}
