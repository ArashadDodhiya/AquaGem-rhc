import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/hash';

// Force dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/delivery-boys
 * Create a new delivery boy
 */
export async function POST(request) {
    try {
        await connectDB();

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, mobile, whatsapp, password } = body;

        // Validate required fields
        if (!name || !mobile || !password) {
            return NextResponse.json(
                { success: false, message: 'Name, mobile, and password are required' },
                { status: 400 }
            );
        }

        // Check if mobile already exists
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'Mobile number already registered' },
                { status: 409 }
            );
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Create delivery boy
        const deliveryBoy = await User.create({
            role: 'delivery_boy',
            name,
            mobile,
            whatsapp: whatsapp || mobile,
            password_hash,
            is_active: true
        });

        return NextResponse.json({
            success: true,
            message: 'Delivery boy created successfully',
            data: {
                _id: deliveryBoy._id,
                name: deliveryBoy.name,
                mobile: deliveryBoy.mobile,
                whatsapp: deliveryBoy.whatsapp,
                role: deliveryBoy.role,
                is_active: deliveryBoy.is_active
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating delivery boy:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/delivery-boys
 * List all delivery boys with filters
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const nameFilter = searchParams.get('name');
        const mobileFilter = searchParams.get('mobile');
        const isActiveFilter = searchParams.get('is_active');

        // Build query
        const query = { role: 'delivery_boy' };

        if (nameFilter) {
            query.name = { $regex: nameFilter, $options: 'i' };
        }
        if (mobileFilter) {
            query.mobile = { $regex: mobileFilter, $options: 'i' };
        }
        if (isActiveFilter !== null && isActiveFilter !== undefined) {
            query.is_active = isActiveFilter === 'true';
        }

        const deliveryBoys = await User.find(query)
            .select('-password_hash')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Delivery boys retrieved successfully',
            data: deliveryBoys
        });

    } catch (error) {
        console.error('Error fetching delivery boys:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
