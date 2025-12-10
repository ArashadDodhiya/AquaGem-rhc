import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { comparePassword } from '@/lib/hash';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';

export async function POST(request) {
    try {
        const { mobile, password } = await request.json();

        if (!mobile || !password) {
            return NextResponse.json(
                { success: false, message: 'Mobile and password are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ mobile }).select('+password_hash');
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (user.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Admin access only' },
                { status: 403 }
            );
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Token payload
        const payload = {
            user_id: user._id.toString(),
            role: user.role,
            mobile: user.mobile,
        };

        const accessToken = await signAccessToken(payload);
        const refreshToken = await signRefreshToken(payload);

        // Create response
        const response = NextResponse.json(
            {
                success: true,
                message: "Admin logged in successfully",
                admin: {
                    _id: user._id,
                    name: user.name,
                    mobile: user.mobile,
                    role: user.role,
                },
                accessToken // also return for Postman
            },
            { status: 200 }
        );

        // --- COOKIE FIX FOR POSTMAN + LOCALHOST ---
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
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
