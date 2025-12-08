import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true
    },
    type: {
        type: String,
        enum: ['whatsapp', 'email'],
        required: true
    },
    template: {
        type: String,
        enum: ['invoice', 'reminder', 'alert'],
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        required: true
    },
    metadata: {
        message_id: String,
        retries: Number
    },
    sent_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Notification', notificationSchema);
