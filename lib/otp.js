/**
 * Generate a random 6-digit OTP
 */
export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP expiry timestamp (10 minutes from now)
 */
export function createOtpExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiryDate) {
    return new Date() > new Date(expiryDate);
}
