import mongoose from 'mongoose';

const jarInventorySchema = new mongoose.Schema({
    total_jars: {
        type: Number,
        default: 0,
        min: 0
    },
    available_jars: {
        type: Number,
        default: 0,
        min: 0
    },
    in_circulation: {
        type: Number,
        default: 0,
        min: 0
    },
    damaged: {
        type: Number,
        default: 0,
        min: 0
    },
    lost: {
        type: Number,
        default: 0,
        min: 0
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('JarInventory', jarInventorySchema);
