import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        flat: { type: String, trim: true },
        building: { type: String, trim: true },
        society: { type: String, trim: true },
        area: { type: String, trim: true },
        city: { type: String, trim: true },
        pincode: {
            type: String,
            trim: true,
            match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
        },
        landmark: { type: String, trim: true },
        geo: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                index: '2dsphere'
            }
        }
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
        custom_days: [{
            type: String,
            enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        }]
    },
    security_deposit: {
        type: Number,
        default: 0,
        min: 0
    },
    empty_jars_issued: {
        type: Number,
        default: 0,
        min: 0
    },
    jar_balance: {
        type: Number,
        default: 0
    },
    delivery_instructions: {
        type: String,
        trim: true
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.CustomerProfile || mongoose.model('CustomerProfile', customerProfileSchema);