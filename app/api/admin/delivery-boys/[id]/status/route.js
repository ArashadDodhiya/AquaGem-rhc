import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

/**
 * PATCH /api/admin/delivery-boys/:id/status
 * Activate or deactivate delivery boy
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

        const deliveryBoy = await User.findByIdAndUpdate(
            id,
            { is_active },
            { new: true }
        ).select('-password_hash').lean();

        if (!deliveryBoy) {
            return NextResponse.json(
                { success: false, message: 'Delivery boy not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Delivery boy ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: deliveryBoy
        });

    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
