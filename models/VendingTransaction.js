import mongoose from 'mongoose';

const vendingTransactionSchema = new mongoose.Schema({
    machine_id: {
        type: String,
        required: true,
        trim: true
    },
    litres: {
        type: Number,
        required: true,
        min: 0
    },
    payment_method: {
        type: String,
        enum: ['upi', 'coin'],
        required: true
    },
    payment_txn_id: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'pending'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('VendingTransaction', vendingTransactionSchema);
