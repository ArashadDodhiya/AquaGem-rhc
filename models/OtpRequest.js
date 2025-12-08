import mongoose from 'mongoose';

const otpRequestSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
        trim: true,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
    },
    otp: {
        type: String,
        required: true
    },
    expires_at: {
        type: Date,
        required: true
    },
    is_used: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('OtpRequest', otpRequestSchema);
