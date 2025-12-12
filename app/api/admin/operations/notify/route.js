import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/operations/notify
 * Send notification to delivery boy (or other users)
 * Body: { delivery_boy_id, message, type, title? }
 */
export async function POST(request) {
    try {
        await connectDB();

        // Check for admin role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { delivery_boy_id, message, type, title } = body;

        if (!delivery_boy_id || !message) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: delivery_boy_id, message' },
                { status: 400 }
            );
        }

        const validTypes = ['whatsapp', 'email', 'push'];
        const notificationType = type && validTypes.includes(type) ? type : 'push'; // Default to push for app alerts

        // Verify recipient exists
        const recipient = await User.findById(delivery_boy_id);
        if (!recipient) {
            return NextResponse.json(
                { success: false, message: 'Recipient not found' },
                { status: 404 }
            );
        }

        // Create Notification Record using Updated Schema
        const notification = new Notification({
            user_id: delivery_boy_id, // New field we added
            customer_id: undefined,   // Explicitly undefined
            type: notificationType,
            template: 'operational',  // New enum value
            title: title || 'Admin Alert',
            message: message,
            status: 'sent', // Mocking success for now
            metadata: {
                priority: 'high',
                admin_id: request.headers.get('x-user-id')
            }
        });

        await notification.save();

        // TODO: Integrate actual FCM / Twilio / WhatsApp API here
        // await sendPushNotification(recipient.fcm_token, title, message);
        console.log(`[Mock Notification] To: ${recipient.name} (${recipient.mobile}) | Msg: ${message}`);

        return NextResponse.json({
            success: true,
            message: 'Notification sent successfully',
            data: {
                notification_id: notification._id,
                recipient: recipient.name,
                type: notificationType,
                status: 'sent'
            }
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json(
            { success: false, message: 'Server error sending notification' },
            { status: 500 }
        );
    }
}
