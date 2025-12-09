import { NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt';

export async function POST(request) {
    try {
        // Get refresh token from cookie
        const refreshToken = request.cookies.get('refresh_token')?.value;

        if (!refreshToken) {
            return NextResponse.json(
                { success: false, message: 'Refresh token not found' },
                { status: 401 }
            );
        }

        // Verify refresh token
        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (error) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired refresh token' },
                { status: 401 }
            );
        }

        // Verify role is delivery_boy
        if (payload.role !== 'delivery_boy') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Delivery boy access only.' },
                { status: 403 }
            );
        }

        // Generate new access token
        const newAccessToken = signAccessToken({
            user_id: payload.user_id,
            role: payload.role,
            mobile: payload.mobile,
        });

        return NextResponse.json(
            {
                success: true,
                token: newAccessToken,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Delivery boy refresh token error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
