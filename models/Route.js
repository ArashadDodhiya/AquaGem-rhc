import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    route_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    assigned_delivery_boy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    areas: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model('Route', routeSchema);
