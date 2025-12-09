import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OtpRequest from '@/models/OtpRequest';
import { generateOtp, createOtpExpiry } from '@/lib/otp';

export async function POST(request) {
    try {
        // Parse request body
        const { mobile } = await request.json();

        // Validate input
        if (!mobile) {
            return NextResponse.json(
                { success: false, message: 'Mobile is required' },
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

        // Connect to database
        await connectDB();

        // Find user by mobile
        const user = await User.findOne({ mobile });

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is delivery boy
        if (user.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Delivery boy access only.' },
                { status: 403 }
            );
        }

        // Check if account is active
        if (!user.is_active) {
            return NextResponse.json(
                { success: false, message: 'Account disabled. Contact support.' },
                { status: 403 }
            );
        }

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

        // TODO: Send OTP via SMS/WhatsApp
        // For now, we'll just log it (in production, integrate with SMS gateway)
        console.log(`📱 OTP for ${mobile}: ${otp}`);

        return NextResponse.json(
            {
                success: true,
                message: 'OTP sent successfully',
                // Remove this in production - only for testing
                ...(process.env.NODE_ENV === 'development' && { otp }),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('OTP request error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
