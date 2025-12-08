import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Route from '../models/Route.js';
import Delivery from '../models/Delivery.js';
import JarTransaction from '../models/JarTransaction.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Ticket from '../models/Ticket.js';
import Notification from '../models/Notification.js';
import OtpRequest from '../models/OtpRequest.js';
import AuditLog from '../models/AuditLog.js';
import VendingTransaction from '../models/VendingTransaction.js';
import JarInventory from '../models/JarInventory.js';
import ReportCache from '../models/ReportCache.js';

dotenv.config();

const verify = async () => {
    try {
        // Check if MONGO_URI is present
        if (!process.env.MONGO_URI) {
            console.log('MONGO_URI is not set in .env. Skipping connection test.');
            // Just check if models are loaded correctly
            console.log('Models loaded successfully:');
            console.log('- User');
            console.log('- CustomerProfile');
            console.log('- Route');
            console.log('- Delivery');
            console.log('- JarTransaction');
            console.log('- Invoice');
            console.log('- Payment');
            console.log('- Product');
            console.log('- Ticket');
            console.log('- Notification');
            console.log('- OtpRequest');
            console.log('- AuditLog');
            console.log('- VendingTransaction');
            console.log('- JarInventory');
            console.log('- ReportCache');
            return;
        }

        await connectDB();
        console.log('Database connection successful.');

        // Create a dummy user in memory (validate schema)
        const user = new User({
            role: 'admin',
            name: 'Test Admin',
            mobile: '1234567890',
            password_hash: 'hash',
            is_active: true
        });

        await user.validate();
        console.log('User schema validation successful.');

        console.log('All checks passed!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
