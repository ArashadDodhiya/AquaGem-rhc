import mongoose from 'mongoose';

const jarTransactionSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true
    },
    type: {
        type: String,
        enum: ['issue', 'return', 'lost'],
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    remarks: {
        type: String,
        trim: true
    },
    delivery_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('JarTransaction', jarTransactionSchema);
