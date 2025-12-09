import { NextResponse } from 'next/server';
import { clearRefreshCookie } from '@/lib/cookies';

export async function POST(request) {
    try {
        // Create response
        const response = NextResponse.json(
            {
                success: true,
                message: 'Logged out successfully',
            },
            { status: 200 }
        );

        // Clear refresh token cookie
        clearRefreshCookie(response);

        return response;
    } catch (error) {
        console.error('Delivery boy logout error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
