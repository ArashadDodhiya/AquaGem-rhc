import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Route from '@/models/Route';

/**
 * GET /api/admin/delivery-boys/:id
 * Fetch delivery boy details
 */
export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        // Fetch delivery boy
        const deliveryBoy = await User.findById(id).select('-password_hash').lean();

        if (!deliveryBoy) {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        if (deliveryBoy.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'User is not a delivery boy' },
                { status: 400 }
            );
        }

        // Find assigned route (inverse lookup)
        const assignedRoute = await Route.findOne({ assigned_delivery_boy: id })
            .select('route_name areas')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Delivery boy details retrieved',
            data: {
                ...deliveryBoy,
                assigned_route: assignedRoute || null
            }
        });

    } catch (error) {
        console.error('Error fetching delivery boy details:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/delivery-boys/:id
 * Update delivery boy info
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

        // Allowed fields for update
        const updates = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.mobile !== undefined) updates.mobile = body.mobile;
        if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, message: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const deliveryBoy = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).select('-password_hash').lean();

        if (!deliveryBoy) {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Delivery boy updated successfully',
            data: deliveryBoy
        });

    } catch (error) {
        console.error('Error updating delivery boy:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
