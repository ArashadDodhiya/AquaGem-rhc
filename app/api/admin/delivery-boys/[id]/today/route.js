import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Route from '@/models/Route';
import CustomerProfile from '@/models/CustomerProfile';
import Delivery from '@/models/Delivery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/delivery-boys/[id]/today
 * Get list of customers scheduled for delivery today for a specific delivery boy
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
        const deliveryBoyId = id;

        // Verify delivery boy exists
        const deliveryBoy = await User.findById(deliveryBoyId);
        if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        // 1. Get Routes assigned to this delivery boy
        const assignedRoutes = await Route.find({ assigned_delivery_boy: deliveryBoyId });
        const assignedRouteIds = assignedRoutes.map(r => r._id);

        if (!assignedRouteIds.length) {
            return NextResponse.json({
                success: true,
                message: 'No routes assigned to this delivery boy',
                data: [],
                stats: { total: 0, completed: 0, pending: 0 }
            });
        }

        // 2. Determine Today's Day (e.g., 'Mon', 'Tue')
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = days[today.getDay()];

        // 3. Find Active Customers on these routes
        // We filter partially in DB, but complex schedule logic might need JS filtering
        const customers = await CustomerProfile.find({
            route_id: { $in: assignedRouteIds },
            is_active: true
        })
            .populate('user_id', 'name mobile whatsapp is_active')
            .populate('route_id', 'route_name areas')
            .lean();

        // 4. Identify who needs delivery today
        const scheduledCustomers = customers.filter(customer => {
            const schedule = customer.delivery_schedule;

            if (!schedule) return true; // Default to yes if undefined? Or no? Let's assume daily default in model
            if (schedule.type === 'daily') return true;
            if (schedule.type === 'custom') {
                return schedule.custom_days && schedule.custom_days.includes(currentDay);
            }
            // 'alternate' logic is tricky without a reference point. 
            // For now, we'll exclude 'alternate' unless we have specific logic (e.g., odd/even days). 
            // Or better: Include them and let the driver decide. 
            // Let's INCLUDE 'alternate' for safety so we don't miss deliveries.
            if (schedule.type === 'alternate') return true;

            return false;
        });

        if (!scheduledCustomers.length) {
            return NextResponse.json({
                success: true,
                message: 'No customers scheduled for today',
                data: [],
                stats: { total: 0, completed: 0, pending: 0 }
            });
        }

        // 5. Check which of these have ALREADY been delivered today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const customerIds = scheduledCustomers.map(c => c.user_id._id);

        const todayDeliveries = await Delivery.find({
            customer_id: { $in: customerIds },
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        // Create a map for quick lookup
        const deliveryMap = new Map();
        todayDeliveries.forEach(d => {
            deliveryMap.set(d.customer_id.toString(), d);
        });

        // 6. Build final list
        const tasks = scheduledCustomers.map(profile => {
            // Check if delivered
            const existingDelivery = deliveryMap.get(profile.user_id._id.toString());
            const isDelivered = !!existingDelivery;

            return {
                customer: {
                    _id: profile.user_id._id,
                    name: profile.user_id.name,
                    mobile: profile.user_id.mobile,
                    whatsapp: profile.user_id.whatsapp,
                    address: profile.address,
                    jar_balance: profile.jar_balance
                },
                route: {
                    _id: profile.route_id._id,
                    name: profile.route_id.route_name
                },
                status: isDelivered ? existingDelivery.status : 'pending', // 'pending', 'delivered', 'not_delivered'
                delivery_id: existingDelivery ? existingDelivery._id : null,
                delivered_qty: existingDelivery ? existingDelivery.delivered_qty : null,
                returned_qty: existingDelivery ? existingDelivery.returned_qty : null,
                delivery_instructions: profile.delivery_instructions
            };
        });

        // Sort: Pending first, then completed
        tasks.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return 0;
        });

        // 7. Calculate stats
        const total = tasks.length;
        const completed = tasks.filter(t => t.status !== 'pending').length;
        const pending = total - completed;

        return NextResponse.json({
            success: true,
            data: tasks,
            stats: {
                total,
                completed,
                pending,
                completion_rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
            },
            meta: {
                date: startOfDay.toISOString().split('T')[0],
                day: currentDay,
                delivery_boy: {
                    _id: deliveryBoy._id,
                    name: deliveryBoy.name
                }
            }
        });

    } catch (error) {
        console.error('Error fetching today\'s schedule:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching schedule' },
            { status: 500 }
        );
    }
}
