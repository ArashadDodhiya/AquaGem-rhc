
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';
import Route from '@/models/Route'; // Imported to ensure Route model is registered for population if needed

/**
 * GET /api/admin/customers/:id
 * Fetch full customer details
 */
export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params; // Next.js 15+ await params

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        // Fetch User
        const user = await User.findById(id).select('-password_hash').lean();
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Customer not found' },
                { status: 404 }
            );
        }

        if (user.role !== 'customer') {
            return NextResponse.json(
                { success: false, message: 'User is not a customer' },
                { status: 400 }
            );
        }

        // Fetch Profile
        const profile = await CustomerProfile.findOne({ user_id: id }).lean();

        // Combine Data
        const data = {
            ...user,
            customer_profile: profile || {}
        };

        return NextResponse.json({
            success: true,
            message: 'Customer details retrieved',
            data: data
        });

    } catch (error) {
        console.error('Error fetching customer details:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/customers/:id
 * Admin updates customer fields (User & Profile)
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

        // Separate fields for User and CustomerProfile
        const userUpdates = {};
        const profileUpdates = {};

        // User allowed fields
        if (body.name !== undefined) userUpdates.name = body.name;
        if (body.whatsapp !== undefined) userUpdates.whatsapp = body.whatsapp;

        // Profile allowed fields
        if (body.address !== undefined) profileUpdates.address = body.address;
        if (body.delivery_instructions !== undefined) profileUpdates.delivery_instructions = body.delivery_instructions;
        if (body.delivery_schedule !== undefined) profileUpdates.delivery_schedule = body.delivery_schedule;

        // Perform Updates
        let user = null;
        let profile = null;

        if (Object.keys(userUpdates).length > 0) {
            user = await User.findByIdAndUpdate(id, userUpdates, { new: true, runValidators: true }).select('-password_hash').lean();
            if (!user) {
                return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
            }
        } else {
            user = await User.findById(id).select('-password_hash').lean();
        }

        if (Object.keys(profileUpdates).length > 0) {
            // Address merge logic? 
            // The requirement says "Address object must be partial-updatable".
            // Mongoose 'findOneAndUpdate' with nested objects usually replaces the whole object if you just pass { address: ... }.
            // To do partial nested update, we usually use dot notation e.g. "address.city": "..." 
            // OR we can just merge in JS if we want to support sending the full object.
            // Prompt says: "Address object must be partial-updatable".
            // If the admin sends `{ address: { city: 'New City' } }`, they expect other fields to remain.
            // Standard mongoose behavior for `address: { ... }` is replacement of the address subdocument.

            // Let's implement smart merging for address if present.
            if (profileUpdates.address) {
                // We need to construct dot notation for MongoDB to do partial update, 
                // OR read, merge, write. Read-merge-write is safer for logic but requires 2 queries.
                // Given standard Mongoose, let's use dot notation key conversion for address properties.

                const addressKeys = Object.keys(profileUpdates.address);
                for (const key of addressKeys) {
                    profileUpdates[`address.${key}`] = profileUpdates.address[key];
                }
                delete profileUpdates.address;
            }

            profile = await CustomerProfile.findOneAndUpdate(
                { user_id: id },
                { $set: profileUpdates },
                { new: true, runValidators: true }
            ).lean();
        } else {
            profile = await CustomerProfile.findOne({ user_id: id }).lean();
        }

        return NextResponse.json({
            success: true,
            message: 'Customer updated successfully',
            data: {
                ...user,
                customer_profile: profile || {}
            }
        });

    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
