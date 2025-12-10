
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerProfile from '@/models/CustomerProfile';

/**
 * PATCH /api/admin/customers/:id/jars
 * Admin corrects jar balance
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

        const { jar_balance } = body;

        // Validating Integer as per prompt "jar_balance must be integer"
        if (!Number.isInteger(jar_balance)) {
            return NextResponse.json(
                { success: false, message: 'Invalid jar balance. Must be an integer.' },
                { status: 400 }
            );
        }

        const profile = await CustomerProfile.findOneAndUpdate(
            { user_id: id },
            { jar_balance },
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
            message: 'Jar balance updated successfully',
            data: profile
        });

    } catch (error) {
        console.error('Error updating jar balance:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
