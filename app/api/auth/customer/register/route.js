import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerProfile from '@/models/CustomerProfile';
import OtpRequest from '@/models/OtpRequest';
import { generateOtp, createOtpExpiry } from '@/lib/otp';

export async function POST(request) {
    try {
        const { name, mobile, whatsapp, address, delivery_schedule } = await request.json();

        // Basic validation
        if (!name || !mobile) {
            return NextResponse.json(
                { success: false, message: 'Name and mobile are required' },
                { status: 400 }
            );
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            return NextResponse.json(
                { success: false, message: 'Mobile must be 10 digits' },
                { status: 400 }
            );
        }

        if (whatsapp && !/^[0-9]{10}$/.test(whatsapp)) {
            return NextResponse.json(
                { success: false, message: 'WhatsApp must be 10 digits' },
                { status: 400 }
            );
        }

        await connectDB();

        // CHECK IF CUSTOMER ALREADY EXISTS
        const existingUser = await User.findOne({ mobile });

        if (existingUser) {
            // IF EXISTS - RETURN ERROR (User should use login route instead)
            return NextResponse.json(
                {
                    success: false,
                    message: 'Mobile number already registered. Please login.',
                    already_registered: true
                },
                { status: 409 }
            );
        }

        // NEW CUSTOMER → CREATE USER
        const user = await User.create({
            role: 'customer',
            name,
            mobile,
            whatsapp: whatsapp || mobile,
            password_hash: 'OTP-LOGIN-NO-PASSWORD', // Mongoose requires a non-empty string
            is_active: true,
        });

        // CREATE CUSTOMER PROFILE
        await CustomerProfile.create({
            user_id: user._id,
            address: address || {},
            delivery_schedule: {
                type: delivery_schedule || 'daily',
            },
            is_active: true,
        });

        // GENERATE OTP FOR FIRST LOGIN
        const otp = generateOtp();
        const expiresAt = createOtpExpiry();

        await OtpRequest.create({
            mobile,
            otp,
            expires_at: expiresAt,
            is_used: false,
        });

        console.log(`📱 Registration OTP for ${mobile}: ${otp}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Registration successful. OTP sent.',
                ...(process.env.NODE_ENV === 'development' && { otp }),
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Customer registration error:', error);

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
