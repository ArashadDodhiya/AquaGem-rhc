import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OtpRequest from '@/models/OtpRequest';
import { generateOtp, createOtpExpiry } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import { sendSMSOTP } from '@/lib/sms';

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

        // Send OTP via both SMS and WhatsApp
        const sendResults = {
            sms: false,
            whatsapp: false
        };

        // Try SMS
        try {
            await sendSMSOTP(mobile, otp);
            sendResults.sms = true;
            console.log(`✅ SMS OTP sent to ${mobile}`);
        } catch (smsError) {
            console.error('SMS sending failed:', smsError.message);
        }

        // Try WhatsApp
        try {
            await sendWhatsAppOTP(mobile, otp);
            sendResults.whatsapp = true;
            console.log(`✅ WhatsApp OTP sent to ${mobile}`);
        } catch (whatsappError) {
            console.error('WhatsApp sending failed:', whatsappError.message);
        }

        // Check if at least one channel succeeded
        if (!sendResults.sms && !sendResults.whatsapp) {
            console.warn('⚠️  Both SMS and WhatsApp failed, but OTP is saved in DB');
        }

        return NextResponse.json(
            {
                success: true,
                message: 'OTP sent successfully',
                channels: sendResults,
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
