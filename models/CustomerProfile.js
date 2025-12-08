import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        flat: String,
        building: String,
        society: String,
        area: String,
        city: String,
        pincode: String,
        landmark: String
    },
    route_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route'
    },
    delivery_schedule: {
        type: {
            type: String,
            enum: ['daily', 'alternate', 'custom'],
            default: 'daily'
        },
        custom_days: [String] // e.g., ['Mon', 'Wed', 'Fri']
    },
    security_deposit: {
        type: Number,
        default: 0
    },
    empty_jars_issued: {
        type: Number,
        default: 0
    },
    jar_balance: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model('CustomerProfile', customerProfileSchema);
