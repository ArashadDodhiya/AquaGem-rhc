import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/operations/schedule/generate
 * Generate delivery schedule
 * Body: { date, route_ids? }
 * Note: Since Delivery records are immutable and require outcome data, this endpoint
 * calculates and returns the "Planned" schedule. Use this to verify or print manifests.
 */
export async function POST(request) {
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

        const body = await request.json();
        const { date, route_ids } = body;

        if (!date) {
            return NextResponse.json(
                { success: false, message: 'Date is required' },
                { status: 400 }
            );
        }

        const scheduleDate = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = days[scheduleDate.getDay()];

        // Filter routes if provided
        const routeQuery = route_ids && route_ids.length > 0
            ? { _id: { $in: route_ids } }
            : {};

        const routes = await Route.find(routeQuery)
            .populate('assigned_delivery_boy', 'name mobile')
            .lean();

        // If specific routes selected, only fetch customers on those routes
        // Optimize query
        const customerQuery = { is_active: true };
        if (route_ids && route_ids.length > 0) {
            customerQuery.route_id = { $in: route_ids };
        }

        const customers = await CustomerProfile.find(customerQuery)
            .populate('user_id', 'name mobile address')
            .lean();

        // Generate Schedule (Similar logic to GET)
        const generatedSchedule = [];

        // Map for quick route lookup
        const routeMap = new Map();
        routes.forEach(r => routeMap.set(r._id.toString(), r));

        customers.forEach(c => {
            let isScheduled = false;
            const s = c.delivery_schedule;

            if (!s || s.type === 'daily') isScheduled = true;
            else if (s.type === 'custom' && s.custom_days?.includes(dayOfWeek)) isScheduled = true;
            else if (s.type === 'alternate') isScheduled = true;

            if (isScheduled) {
                // If filtering by route and customer has no route, skip?
                // Or if customer has route but not in selected list, skip?
                // The DB query handled strict filtering, but if we query all customers (no route filter)
                // we should include unassigned.

                const routeId = c.route_id ? c.route_id.toString() : null;

                // If we are filtering by routes, and this customer is unassigned or on excluded route, skip
                // (Though DB query should have caught this if route_id filter was used)

                const route = routeId ? routeMap.get(routeId) : null;

                // Add to list
                generatedSchedule.push({
                    customer: {
                        _id: c.user_id._id,
                        name: c.user_id.name,
                        mobile: c.user_id.mobile,
                        address: c.address
                    },
                    route: route ? {
                        _id: route._id,
                        name: route.route_name,
                        assigned_delivery_boy: route.assigned_delivery_boy
                    } : null
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Schedule generated successfully',
            data: {
                date,
                day: dayOfWeek,
                total_tasks: generatedSchedule.length,
                tasks: generatedSchedule
            }
        });

    } catch (error) {
        console.error('Error generating schedule:', error);
        return NextResponse.json(
            { success: false, message: 'Server error generating schedule' },
            { status: 500 }
        );
    }
}
