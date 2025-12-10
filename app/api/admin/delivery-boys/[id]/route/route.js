import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * PATCH /api/admin/delivery-boys/:id/route
 * Assign delivery boy to a route
 */
export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        const { route_id } = body;

        // Validate Route ID
        if (!route_id || !mongoose.Types.ObjectId.isValid(route_id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid route ID' },
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

        // Verify route exists
        const route = await Route.findById(route_id);
        if (!route) {
            return NextResponse.json(
                { success: false, message: 'Route not found' },
                { status: 404 }
            );
        }

        // Clear previous assignment (if this delivery boy was assigned to another route)
        await Route.updateMany(
            { assigned_delivery_boy: id },
            { $unset: { assigned_delivery_boy: "" } }
        );

        // Assign to new route
        route.assigned_delivery_boy = id;
        await route.save();

        return NextResponse.json({
            success: true,
            message: 'Route assigned successfully',
            data: {
                delivery_boy_id: id,
                route: {
                    _id: route._id,
                    route_name: route.route_name,
                    areas: route.areas
                }
            }
        });

    } catch (error) {
        console.error('Error assigning route:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
