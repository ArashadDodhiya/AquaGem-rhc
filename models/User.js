import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['admin', 'delivery_boy', 'customer'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    whatsapp: {
        type: String
    },
    password_hash: {
        type: String,
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model('User', userSchema);
