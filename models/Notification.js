import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: false // Changed from true to false
    },
    user_id: { // Added for generic recipients (Delivery Boys, Admins)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: ['whatsapp', 'email', 'push'], // Added 'push'
        required: true
    },
    template: {
        type: String,
        enum: ['invoice', 'reminder', 'alert', 'operational'], // Added 'operational'
        required: true
    },
    title: { // Optional title for push/alerts
        type: String,
        trim: true
    },
    message: { // Optional custom message body
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'queued'], // Added 'queued'
        required: true,
        default: 'queued'
    },
    metadata: {
        message_id: String,
        retries: Number,
        priority: { type: String, enum: ['high', 'normal'] }
    },
    sent_at: {
        type: Date,
        default: Date.now
    }
});

// Validate that at least one recipient is provided
notificationSchema.pre('save', function (next) {
    if (!this.customer_id && !this.user_id) {
        return next(new Error('Notification must have a recipient (customer_id or user_id)'));
    }
    next();
});

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
