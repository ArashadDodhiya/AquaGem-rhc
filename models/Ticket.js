import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'closed'],
        default: 'open'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Ticket', ticketSchema);
