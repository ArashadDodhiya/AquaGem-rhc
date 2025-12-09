import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';
import OtpRequest from '@/models/OtpRequest';
import { generateOtp, createOtpExpiry } from '@/lib/otp';

export async function POST(request) {
    try {
        // Parse request body
        const { name, mobile, whatsapp, address, delivery_schedule } = await request.json();

        // Validate required fields
        if (!name || !mobile) {
            return NextResponse.json(
                { success: false, message: 'Name and mobile are required' },
                { status: 400 }
            );
        }

        // Validate mobile format (10 digits)
        if (!/^[0-9]{10}$/.test(mobile)) {
            return NextResponse.json(
                { success: false, message: 'Mobile must be 10 digits' },
                { status: 400 }
            );
        }

        // Validate whatsapp if provided
        if (whatsapp && !/^[0-9]{10}$/.test(whatsapp)) {
            return NextResponse.json(
                { success: false, message: 'WhatsApp must be 10 digits' },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'Mobile number already registered' },
                { status: 409 }
            );
        }

        // Create User with role='customer'
        const user = await User.create({
            role: 'customer',
            name,
            mobile,
            whatsapp: whatsapp || mobile,
            password_hash: '', // Not used for customers
            is_active: true,
        });

        // Create CustomerProfile
        await CustomerProfile.create({
            user_id: user._id,
            address: address || {},
            delivery_schedule: {
                type: delivery_schedule || 'daily',
            },
            is_active: true,
        });

        // Generate OTP
        const otp = generateOtp();
        const expiresAt = createOtpExpiry();

        // Save OTP to database
        await OtpRequest.create({
            mobile,
            otp,
            expires_at: expiresAt,
            is_used: false,
        });

        // Log OTP to console (for development/testing)
        console.log(`📱 Registration OTP for ${mobile}: ${otp}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Registration successful. OTP sent.',
                // Remove this in production - only for testing
                ...(process.env.NODE_ENV === 'development' && { otp }),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Customer registration error:', error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, message: 'Mobile number already registered' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
