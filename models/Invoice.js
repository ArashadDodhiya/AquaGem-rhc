import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true
    },
    month: {
        type: String, // Format: YYYY-MM
        required: true,
        match: [/^\d{4}-\d{2}$/, 'Please enter a valid month in YYYY-MM format']
    },
    jars_delivered: {
        type: Number,
        default: 0,
        min: 0
    },
    jars_returned: {
        type: Number,
        default: 0,
        min: 0
    },
    deposit_adjustment: {
        type: Number,
        default: 0
    },
    amount_due: {
        type: Number,
        required: true,
        min: 0
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'partial'],
        default: 'pending'
    },
    pdf_url: {
        type: String
    },
    upi_qr_url: {
        type: String
    },
    upi_id: {
        type: String,
        trim: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Unique compound index on customer_id and month
invoiceSchema.index({ customer_id: 1, month: 1 }, { unique: true });

export default mongoose.model('Invoice', invoiceSchema);
