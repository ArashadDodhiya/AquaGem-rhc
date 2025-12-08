import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerProfile',
        required: true,
        immutable: true
    },
    delivery_boy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    date: {
        type: Date,
        required: true,
        immutable: true
    },
    delivered_qty: {
        type: Number,
        required: true,
        immutable: true,
        min: 0
    },
    returned_qty: {
        type: Number,
        required: true,
        immutable: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['delivered', 'not_delivered', 'partial'],
        required: true,
        immutable: true
    },
    notes: {
        type: String,
        immutable: true,
        trim: true
    },
    photo_url: {
        type: String
    },
    signature_url: {
        type: String
    },
    gps_location: {
        lat: Number,
        lng: Number
    },
    created_at: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Prevent updates to existing documents
deliverySchema.pre('save', function (next) {
    if (!this.isNew) {
        const err = new Error('Delivery documents are immutable.');
        return next(err);
    }
    next();
});

export default mongoose.model('Delivery', deliverySchema);
