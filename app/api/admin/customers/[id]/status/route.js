
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';

/**
 * PATCH /api/admin/customers/:id/status
 * Activate or deactivate customer
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

        const { is_active } = body;

        if (typeof is_active !== 'boolean') {
            return NextResponse.json(
                { success: false, message: 'Invalid status value. Must be boolean.' },
                { status: 400 }
            );
        }

        // Update User
        const user = await User.findByIdAndUpdate(
            id,
            { is_active },
            { new: true }
        ).select('-password_hash').lean();

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Customer not found' },
                { status: 404 }
            );
        }

        // Update Profile
        // We update profile too as requested, though strictly keeping one source of truth is better.
        // But prompt says "Updates BOTH".
        const profile = await CustomerProfile.findOneAndUpdate(
            { user_id: id },
            { is_active },
            { new: true }
        ).lean();

        return NextResponse.json({
            success: true,
            message: `Customer ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                ...user,
                customer_profile: profile || {}
            }
        });

    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
