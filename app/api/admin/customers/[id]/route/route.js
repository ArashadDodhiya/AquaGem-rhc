
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerProfile from '@/models/CustomerProfile';
import Route from '@/models/Route';
import mongoose from 'mongoose';

/**
 * PATCH /api/admin/customers/:id/route
 * Assign or change customer’s delivery route
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

        // Check if route exists
        const routeExists = await Route.findById(route_id);
        if (!routeExists) {
            return NextResponse.json(
                { success: false, message: 'Route not found' },
                { status: 404 }
            );
        }

        // Update Customer Route
        const profile = await CustomerProfile.findOneAndUpdate(
            { user_id: id },
            { route_id },
            { new: true }
        ).populate('route_id', 'name').lean();

        if (!profile) {
            return NextResponse.json(
                { success: false, message: 'Customer profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Route assigned successfully',
            data: profile
        });

    } catch (error) {
        console.error('Error assigning route:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
