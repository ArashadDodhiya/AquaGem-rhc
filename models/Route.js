import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    route_name: {
        type: String,
        required: true
    },
    assigned_delivery_boy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    areas: [String]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model('Route', routeSchema);
