import { hashPassword } from '../lib/hash.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to create a delivery boy user for testing authentication
 * Run: node scripts/create-delivery-boy.js
 */

async function createDeliveryBoy() {
    try {
        console.log('🔄 Connecting to Database...');
        await connectDB();
        console.log('✅ Database Connected');

        const deliveryBoyData = {
            role: 'delivery_boy',
            name: 'Test Delivery Boy',
            mobile: '8888888888',
            password_hash: await hashPassword('delivery123'), // Change this password
            is_active: true,
        };

        // Check if delivery boy already exists
        const existingDeliveryBoy = await User.findOne({ mobile: deliveryBoyData.mobile });

        if (existingDeliveryBoy) {
            console.log('⚠️  Delivery boy user already exists with mobile:', deliveryBoyData.mobile);
            console.log('Delivery Boy ID:', existingDeliveryBoy._id);
            process.exit(0);
        }

        // Create delivery boy user
        const deliveryBoy = await User.create(deliveryBoyData);

        console.log('✅ Delivery boy user created successfully!');
        console.log('📋 Delivery Boy Details:');
        console.log('   ID:', deliveryBoy._id);
        console.log('   Name:', deliveryBoy.name);
        console.log('   Mobile:', deliveryBoy.mobile);
        console.log('   Role:', deliveryBoy.role);
        console.log('   Password: delivery123 (CHANGE THIS IN PRODUCTION!)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating delivery boy:', error);
        process.exit(1);
    }
}

createDeliveryBoy();
