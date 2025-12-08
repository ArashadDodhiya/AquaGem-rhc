import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true
    },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    method: {
        type: String,
        enum: ['cash', 'upi', 'card'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transaction_id: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Payment', paymentSchema);
