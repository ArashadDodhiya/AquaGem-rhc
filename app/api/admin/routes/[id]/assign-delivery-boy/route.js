import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * PATCH /api/admin/routes/:id/assign-delivery-boy
 * Assign delivery boy to route
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

        const { delivery_boy_id } = body;

        // Validate delivery boy ID
        if (!delivery_boy_id || !mongoose.Types.ObjectId.isValid(delivery_boy_id)) {
            return NextResponse.json(
                { success: false, message: 'Invalid delivery boy ID' },
                { status: 400 }
            );
        }

        // Verify route exists
        const route = await Route.findById(id);
        if (!route) {
            return NextResponse.json(
                { success: false, message: 'Route not found' },
                { status: 404 }
            );
        }

        // Verify delivery boy exists and has correct role
        const deliveryBoy = await User.findById(delivery_boy_id);
        if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        // Clear previous assignments for this delivery boy
        await Route.updateMany(
            { assigned_delivery_boy: delivery_boy_id },
            { $unset: { assigned_delivery_boy: "" } }
        );

        // Assign to this route
        route.assigned_delivery_boy = delivery_boy_id;
        await route.save();

        // Populate and return
        const updatedRoute = await Route.findById(id)
            .populate('assigned_delivery_boy', 'name mobile')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Delivery boy assigned to route successfully',
            data: updatedRoute
        });

    } catch (error) {
        console.error('Error assigning delivery boy:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
