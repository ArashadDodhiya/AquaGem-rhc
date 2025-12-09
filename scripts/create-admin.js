import { hashPassword } from '../lib/hash.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to create an admin user for testing authentication
 * Run: node scripts/create-admin.js
 */

async function createAdmin() {
    try {
        console.log('🔄 Connecting to Database...');
        await connectDB();
        console.log('✅ Database Connected');

        const adminData = {
            role: 'admin',
            name: 'Test Admin',
            mobile: '9999999999',
            password_hash: await hashPassword('admin123'), // Change this password
            is_active: true,
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ mobile: adminData.mobile });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists with mobile:', adminData.mobile);
            console.log('Admin ID:', existingAdmin._id);
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);

        console.log('✅ Admin user created successfully!');
        console.log('📋 Admin Details:');
        console.log('   ID:', admin._id);
        console.log('   Name:', admin.name);
        console.log('   Mobile:', admin.mobile);
        console.log('   Role:', admin.role);
        console.log('   Password: admin123 (CHANGE THIS IN PRODUCTION!)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
