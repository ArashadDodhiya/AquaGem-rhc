import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OtpRequest from '@/models/OtpRequest';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/cookies';
import { isOtpExpired } from '@/lib/otp';

export async function POST(request) {
    try {
        // Parse request body
        const { mobile, otp } = await request.json();

        // Validate input
        if (!mobile || !otp) {
            return NextResponse.json(
                { success: false, message: 'Mobile and OTP are required' },
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

        // Validate OTP format (numeric)
        if (!/^[0-9]+$/.test(otp)) {
            return NextResponse.json(
                { success: false, message: 'OTP must be numeric' },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Find the most recent OTP request for this mobile
        const otpRequest = await OtpRequest.findOne({ mobile, is_used: false })
            .sort({ created_at: -1 });

        if (!otpRequest) {
            return NextResponse.json(
                { success: false, message: 'No OTP request found. Please request a new OTP.' },
                { status: 404 }
            );
        }

        // Check if OTP is expired
        if (isOtpExpired(otpRequest.expires_at)) {
            return NextResponse.json(
                { success: false, message: 'OTP has expired. Please request a new OTP.' },
                { status: 400 }
            );
        }

        // Verify OTP
        if (otpRequest.otp !== otp) {
            return NextResponse.json(
                { success: false, message: 'Invalid OTP' },
                { status: 401 }
            );
        }

        // Mark OTP as used
        otpRequest.is_used = true;
        await otpRequest.save();

        // Find user
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

        // Generate tokens
        const tokenPayload = {
            user_id: user._id.toString(),
            role: user.role,
            mobile: user.mobile,
        };

        const accessToken = await signAccessToken(tokenPayload);
        const refreshToken = await signRefreshToken(tokenPayload);

        // Create response
        const response = NextResponse.json(
            {
                success: true,
                token: accessToken,
                delivery_boy: {
                    _id: user._id,
                    name: user.name,
                    mobile: user.mobile,
                    role: user.role,
                },
            },
            { status: 200 }
        );

        // Set refresh token in HttpOnly cookie
        response.cookies.set("accessToken", accessToken, {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            priority: "high"   // ← THIS ENSURES ACCESS TOKEN IS SENT FIRST
        });

        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            priority: "low"
        });

        return response;
    } catch (error) {
        console.error('OTP verification error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
