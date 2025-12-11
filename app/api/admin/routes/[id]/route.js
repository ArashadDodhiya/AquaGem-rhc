import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';

/**
 * PATCH /api/admin/routes/:id
 * Update route (name, areas)
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
        if (body.route_name !== undefined) updates.route_name = body.route_name;
        if (body.areas !== undefined) updates.areas = body.areas;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, message: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const route = await Route.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).populate('assigned_delivery_boy', 'name mobile').lean();

        if (!route) {
            return NextResponse.json(
                { success: false, message: 'Route not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Route updated successfully',
            data: route
        });

    } catch (error) {
        console.error('Error updating route:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
