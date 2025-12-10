
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';

// Force dynamic since we read query params
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customers
 * List all customers with filters
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check for admin role (redundant if middleware works, but good for safety)
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const nameFilter = searchParams.get('name');
        const mobileFilter = searchParams.get('mobile');
        const areaFilter = searchParams.get('area');
        const routeIdFilter = searchParams.get('route_id');
        const isActiveFilter = searchParams.get('is_active');

        // Build User query (role must be customer)
        const userQuery = { role: 'customer' };
        if (nameFilter) {
            userQuery.name = { $regex: nameFilter, $options: 'i' };
        }
        if (mobileFilter) {
            userQuery.mobile = { $regex: mobileFilter, $options: 'i' };
        }
        // If filtering by is_active, existing schema has is_active in both. 
        // We'll filter primarily by User.is_active for list view consistency.
        if (isActiveFilter !== null && isActiveFilter !== undefined) {
            userQuery.is_active = isActiveFilter === 'true';
        }

        // Fetch users first
        const users = await User.find(userQuery).select('_id name mobile whatsapp is_active').lean();

        if (!users.length) {
            return NextResponse.json({ success: true, data: [] });
        }

        const userIds = users.map(u => u._id);

        // Build Profile query
        const profileQuery = { user_id: { $in: userIds } };
        if (areaFilter) {
            // Nested field query
            profileQuery['address.area'] = { $regex: areaFilter, $options: 'i' };
        }
        if (routeIdFilter) {
            profileQuery.route_id = routeIdFilter;
        }

        const profiles = await CustomerProfile.find(profileQuery)
            .populate('route_id', 'name') // Optional: populate route name if helpful
            .lean();

        // Manually join
        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p.user_id.toString(), p);
        });

        // Combine data
        const combinedData = [];

        // If we have profile filters (area/route), we must filter the users list to only include those that matched in profiles
        // If no profile filters, we show all users (profiles might be missing if implementation is weird, but typically 1:1)

        const hasProfileFilters = !!(areaFilter || routeIdFilter);

        for (const user of users) {
            const profile = profileMap.get(user._id.toString());

            if (hasProfileFilters && !profile) {
                continue; // Skip if user matches auth query but not profile query
            }

            // Start with user fields
            const customer = {
                _id: user._id, // User ID is the main ID
                name: user.name,
                mobile: user.mobile,
                whatsapp: user.whatsapp,
                user_is_active: user.is_active,
                // Default profile fields if missing (shouldn't happen for valid customers)
                address: profile?.address || {},
                route_id: profile?.route_id || null, // Could be object if populated
                jar_balance: profile?.jar_balance || 0,
                security_deposit: profile?.security_deposit || 0,
                profile_is_active: profile?.is_active || false,
                delivery_schedule: profile?.delivery_schedule || null
            };

            // Consolidate is_active?? Request says "should join like: { ... is_active }"
            // Let's use User.is_active as the primary "is_active" for the list, 
            // but maybe return both or normalize.
            // We'll return just `is_active` from User as the primary flag.
            customer.is_active = user.is_active;

            combinedData.push(customer);
        }

        return NextResponse.json({
            success: true,
            message: 'Customers retrieved successfully',
            data: combinedData
        });

    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching customers' },
            { status: 500 }
        );
    }
}
