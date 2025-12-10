import { SignJWT, jwtVerify } from 'jose';

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production');
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production');

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Sign Access Token (15 minutes)
 */
export async function signAccessToken(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(ACCESS_TOKEN_SECRET);
}

/**
 * Sign Refresh Token (7 days)
 */
export async function signRefreshToken(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(REFRESH_TOKEN_SECRET);
}

/**
 * Verify Access Token
 */
export async function verifyAccessToken(token) {
    try {
        const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
        return payload;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        throw new Error('Invalid or expired access token');
    }
}

/**
 * Verify Refresh Token
 */
export async function verifyRefreshToken(token) {
    try {
        const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET);
        return payload;
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}
