import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/live-tracking
 * Live delivery tracking: Current status of all active deliveries with GPS locations.
 * Note: Since we don't have real-time stream, we use the latest delivery location as a proxy.
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

        // Fetch deliveries from today that have GPS data
        const recentDeliveries = await Delivery.aggregate([
            {
                $match: {
                    date: { $gte: startOfDay, $lte: endOfDay },
                    gps_location: { $exists: true, $ne: null }
                }
            },
            {
                $sort: { created_at: -1 } // Newest first
            },
            // Group by delivery boy to get their LATEST location
            {
                $group: {
                    _id: "$delivery_boy_id",
                    last_delivery: { $first: "$$ROOT" }
                }
            }
        ]);

        // Populate delivery boy details
        const trackingData = await User.populate(recentDeliveries, {
            path: "last_delivery.delivery_boy_id",
            select: "name mobile is_active"
        });

        const result = trackingData.map(item => {
            const data = item.last_delivery;
            return {
                delivery_boy: {
                    _id: data.delivery_boy_id._id,
                    name: data.delivery_boy_id.name,
                    mobile: data.delivery_boy_id.mobile,
                    is_active: data.delivery_boy_id.is_active
                },
                last_location: {
                    lat: data.gps_location.lat,
                    lng: data.gps_location.lng,
                    timestamp: data.created_at
                },
                last_action: data.status, // delivered/failed/partial
                last_customer_time: data.created_at
            };
        });

        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                active_agents: result.length,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Error fetching live tracking:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching live tracking' },
            { status: 500 }
        );
    }
}
