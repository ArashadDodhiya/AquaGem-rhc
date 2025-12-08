import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    entity: {
        type: String,
        required: true,
        enum: ['customer', 'invoice', 'delivery', 'deposit', 'jar', 'other']
    },
    entity_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['update', 'create', 'delete', 'status_change']
    },
    before: {
        type: mongoose.Schema.Types.Mixed
    },
    after: {
        type: mongoose.Schema.Types.Mixed
    },
    performed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    performed_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('AuditLog', auditLogSchema);
