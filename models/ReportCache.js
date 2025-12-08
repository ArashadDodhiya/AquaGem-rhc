import mongoose from 'mongoose';

const reportCacheSchema = new mongoose.Schema({
    report_type: {
        type: String,
        required: true,
        trim: true
    },
    period: {
        type: String, // e.g., '2023-10', '2023-Q4'
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // JSON data
        required: true
    },
    generated_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ReportCache', reportCacheSchema);
