
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerProfile from '@/models/CustomerProfile';

/**
 * PATCH /api/admin/customers/:id/deposit
 * Admin updates customer's security deposit
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

        const { security_deposit } = body;

        if (typeof security_deposit !== 'number' || security_deposit < 0) {
            return NextResponse.json(
                { success: false, message: 'Invalid security deposit. Must be a non-negative number.' },
                { status: 400 }
            );
        }

        const profile = await CustomerProfile.findOneAndUpdate(
            { user_id: id },
            { security_deposit },
            { new: true }
        ).lean();

        if (!profile) {
            return NextResponse.json(
                { success: false, message: 'Customer profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Security deposit updated successfully',
            data: profile
        });

    } catch (error) {
        console.error('Error updating deposit:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
