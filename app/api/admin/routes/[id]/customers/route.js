import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';
import CustomerProfile from '@/models/CustomerProfile';
import User from '@/models/User';

/**
 * GET /api/admin/routes/:id/customers
 * Get all customers assigned to this route
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

        // Verify route exists
        const route = await Route.findById(id).lean();
        if (!route) {
            return NextResponse.json(
                { success: false, message: 'Route not found' },
                { status: 404 }
            );
        }

        // Find all customer profiles with this route_id
        const customerProfiles = await CustomerProfile.find({ route_id: id })
            .populate('user_id', 'name mobile whatsapp is_active')
            .lean();

        // Transform data to combine user and profile info
        const customers = customerProfiles.map(profile => ({
            _id: profile.user_id?._id,
            name: profile.user_id?.name,
            mobile: profile.user_id?.mobile,
            whatsapp: profile.user_id?.whatsapp,
            is_active: profile.user_id?.is_active,
            address: profile.address,
            delivery_schedule: profile.delivery_schedule,
            jar_balance: profile.jar_balance,
            security_deposit: profile.security_deposit
        }));

        return NextResponse.json({
            success: true,
            message: 'Customers retrieved successfully',
            data: {
                route: {
                    _id: route._id,
                    route_name: route.route_name,
                    areas: route.areas
                },
                customers: customers,
                total_customers: customers.length
            }
        });

    } catch (error) {
        console.error('Error fetching route customers:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
