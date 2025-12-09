import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { comparePassword } from '@/lib/hash';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/cookies';

export async function POST(request) {
    try {
        // Parse request body
        const { mobile, password } = await request.json();

        // Validate input
        if (!mobile || !password) {
            return NextResponse.json(
                { success: false, message: 'Mobile and password are required' },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Find user by mobile
        const user = await User.findOne({ mobile }).select('+password_hash');

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Admin access only.' },
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

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate tokens
        const tokenPayload = {
            user_id: user._id.toString(),
            role: user.role,
            mobile: user.mobile,
        };

        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        // Create response
        const response = NextResponse.json(
            {
                success: true,
                token: accessToken,
                admin: {
                    _id: user._id,
                    name: user.name,
                    mobile: user.mobile,
                    role: user.role,
                },
            },
            { status: 200 }
        );

        // Set refresh token in HttpOnly cookie
        setRefreshCookie(response, refreshToken);

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
