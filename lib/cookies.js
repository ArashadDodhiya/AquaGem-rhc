/**
 * Set HttpOnly Refresh Token Cookie
 */
export function setRefreshCookie(response, token) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set('refresh_token', token, {
        httpOnly: true,
        secure: isProduction, // Only HTTPS in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
    });
}

/**
 * Clear Refresh Token Cookie
 */
export function clearRefreshCookie(response) {
    response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
    });
}
