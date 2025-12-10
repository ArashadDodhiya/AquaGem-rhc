
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerProfile from '@/models/CustomerProfile';

/**
 * PATCH /api/admin/customers/:id/schedule
 * Update delivery schedule
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

        const { type, custom_days } = body;
        const validTypes = ['daily', 'alternate', 'custom'];
        const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { success: false, message: 'Invalid schedule type' },
                { status: 400 }
            );
        }

        if (type === 'custom') {
            if (!Array.isArray(custom_days) || custom_days.length === 0) {
                return NextResponse.json(
                    { success: false, message: 'Custom days require at least one day' },
                    { status: 400 }
                );
            }
            const invalidDay = custom_days.find(d => !validDays.includes(d));
            if (invalidDay) {
                return NextResponse.json(
                    { success: false, message: `Invalid day: ${invalidDay}` },
                    { status: 400 }
                );
            }
        }

        const updateData = {
            'delivery_schedule.type': type,
            // Only set custom_days if type is custom, otherwise clear it or keep it?
            // Usually good to clear it if not custom to avoid confusion, but not strictly required.
            // Let's set it if provided, or empty if not custom.
            'delivery_schedule.custom_days': type === 'custom' ? custom_days : []
        };

        const profile = await CustomerProfile.findOneAndUpdate(
            { user_id: id },
            { $set: updateData },
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
            message: 'Schedule updated successfully',
            data: profile
        });

    } catch (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
