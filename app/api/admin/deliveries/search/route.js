import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/search
 * Advanced search for deliveries with cross-collection filtering
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check for admin role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Search Params
        const name = searchParams.get('name');
        const mobile = searchParams.get('mobile');
        const area = searchParams.get('area');
        const status = searchParams.get('status');
        const date_from = searchParams.get('date_from');
        const date_to = searchParams.get('date_to');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const deliveryQuery = {};

        // 1. Resolve CustomerProfile IDs from Name/Mobile/Area
        // We need to find Profiles because Delivery stores 'customer_id' as Ref to CustomerProfile
        let profileIds = null;

        if (name || mobile || area) {
            let matchedUserIds = [];

            // A. If searching by Name/Mobile, first find Users
            if (name || mobile) {
                const userQuery = { role: 'customer' };
                if (name) userQuery.name = { $regex: name, $options: 'i' };
                if (mobile) userQuery.mobile = { $regex: mobile, $options: 'i' };

                const matchedUsers = await User.find(userQuery).select('_id').lean();
                matchedUserIds = matchedUsers.map(u => u._id);

                // If name/mobile filters used but no users found, short circuit
                if (matchedUserIds.length === 0 && !area) {
                    return NextResponse.json({
                        success: true,
                        data: [],
                        pagination: { page, limit, total: 0, totalPages: 0 }
                    });
                }
            }

            // B. Find Profiles matching Area OR belonging to matched Users
            const profileQuery = {};
            const conditions = [];

            if (matchedUserIds.length > 0) {
                conditions.push({ user_id: { $in: matchedUserIds } });
            }
            if (area) {
                conditions.push({ 'address.area': { $regex: area, $options: 'i' } });
            }

            // Combine conditions.
            // If we have both (Name/Mobile AND Area), user implies: find customers matching Name/Mobile AND Area?
            // "Search customer name, mobile, area" - usually acts as filters.
            // If I provide Name="John" and Area="North", I likely want John from North.

            if (name || mobile) {
                profileQuery.user_id = { $in: matchedUserIds };
            }
            if (area) {
                profileQuery['address.area'] = { $regex: area, $options: 'i' };
            }

            const matchedProfiles = await CustomerProfile.find(profileQuery).select('_id').lean();
            profileIds = matchedProfiles.map(p => p._id);

            if (profileIds.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 }
                });
            }
        }

        // 2. Build Delivery Query
        if (profileIds !== null) {
            deliveryQuery.customer_id = { $in: profileIds };
        }

        if (status) {
            deliveryQuery.status = status;
        }

        if (date_from || date_to) {
            deliveryQuery.date = {};
            if (date_from) {
                const fromDate = new Date(date_from);
                fromDate.setHours(0, 0, 0, 0);
                deliveryQuery.date.$gte = fromDate;
            }
            if (date_to) {
                const toDate = new Date(date_to);
                toDate.setHours(23, 59, 59, 999);
                deliveryQuery.date.$lte = toDate;
            }
        }

        // 3. Execute Query
        const total = await Delivery.countDocuments(deliveryQuery);

        const deliveries = await Delivery.find(deliveryQuery)
            .sort({ date: -1, created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'customer_id',
                select: 'user_id address',
                populate: { path: 'user_id', select: 'name mobile' }
            })
            .populate('delivery_boy_id', 'name mobile')
            .lean();

        // 4. Transform Result to Flat Structure
        const data = deliveries.map(d => ({
            _id: d._id,
            date: d.date,
            status: d.status,
            customer: {
                _id: d.customer_id?._id, // This is Profile ID
                user_id: d.customer_id?.user_id?._id,
                name: d.customer_id?.user_id?.name || 'Unknown',
                mobile: d.customer_id?.user_id?.mobile || 'N/A',
                area: d.customer_id?.address?.area || 'N/A'
            },
            delivery_boy: {
                _id: d.delivery_boy_id?._id,
                name: d.delivery_boy_id?.name || 'Unknown'
            },
            delivered_qty: d.delivered_qty,
            returned_qty: d.returned_qty,
            created_at: d.created_at
        }));

        return NextResponse.json({
            success: true,
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });

    } catch (error) {
        console.error('Error searching deliveries:', error);
        return NextResponse.json(
            { success: false, message: 'Server error searching deliveries' },
            { status: 500 }
        );
    }
}
