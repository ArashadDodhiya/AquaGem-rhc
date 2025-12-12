import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';
import CustomerProfile from '@/models/CustomerProfile';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/schedule/[date]
 * Get delivery schedule for specific date
 * Returns: All customers scheduled for delivery on that date, grouped by route
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

        const { date } = params;
        const scheduleDate = new Date(date);

        if (isNaN(scheduleDate.getTime())) {
            return NextResponse.json(
                { success: false, message: 'Invalid date format' },
                { status: 400 }
            );
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = days[scheduleDate.getDay()];

        // 1. Fetch All Routes with Delivery Boys
        const routes = await Route.find()
            .populate('assigned_delivery_boy', 'name mobile')
            .lean();

        // 2. Fetch Active Customers
        const customers = await CustomerProfile.find({ is_active: true })
            .populate('user_id', 'name mobile address')
            .lean();

        // 3. Process Schedule
        const scheduleByRoute = {};

        // Initialize groups
        routes.forEach(r => {
            scheduleByRoute[r._id.toString()] = {
                route_info: {
                    _id: r._id,
                    name: r.route_name,
                    areas: r.areas,
                    assigned_delivery_boy: r.assigned_delivery_boy
                },
                customers: []
            };
        });
        // Add "Unassigned" group
        scheduleByRoute['unassigned'] = {
            route_info: { _id: null, name: 'Unassigned', areas: [] },
            customers: []
        };

        // Filter and Group Customers
        customers.forEach(c => {
            let isScheduled = false;
            const s = c.delivery_schedule;

            if (!s || s.type === 'daily') isScheduled = true;
            else if (s.type === 'custom' && s.custom_days?.includes(dayOfWeek)) isScheduled = true;
            else if (s.type === 'alternate') isScheduled = true; // In real app, check last delivery date

            if (isScheduled) {
                const routeId = c.route_id ? c.route_id.toString() : 'unassigned';
                const group = scheduleByRoute[routeId] || scheduleByRoute['unassigned'];

                group.customers.push({
                    user_id: c.user_id._id,
                    name: c.user_id.name,
                    mobile: c.user_id.mobile,
                    address: c.address,
                    jar_balance: c.jar_balance,
                    delivery_instructions: c.delivery_instructions
                });
            }
        });

        // 4. Format Response (Remove empty routes if preferred, or keep all)
        // Let's filter out empty routes to keep it clean
        const result = Object.values(scheduleByRoute)
            .filter(group => group.customers.length > 0)
            .sort((a, b) => b.customers.length - a.customers.length); // Biggest routes first

        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                date: date,
                day: dayOfWeek,
                total_routes_active: result.length,
                total_deliveries: result.reduce((acc, curr) => acc + curr.customers.length, 0)
            }
        });

    } catch (error) {
        console.error('Error fetching schedule:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching schedule' },
            { status: 500 }
        );
    }
}
