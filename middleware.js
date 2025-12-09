import { NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/jwt';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Define protected routes (admin-only)
    const protectedRoutes = ['/api/admin'];

    // Check if the current path is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized. No token provided.' },
            { status: 401 }
        );
    }

    // Verify token
    try {
        const payload = verifyAccessToken(token);

        // Check if user is admin
        if (payload.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden. Admin access only.' },
                { status: 403 }
            );
        }

        // Attach user data to request headers (for API routes to access)
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.user_id);
        requestHeaders.set('x-user-role', payload.role);
        requestHeaders.set('x-user-mobile', payload.mobile);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized. Invalid or expired token.' },
            { status: 401 }
        );
    }
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        '/api/admin/:path*', // Protect all /api/admin/* routes
    ],
};
