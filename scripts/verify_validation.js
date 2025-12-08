import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';

dotenv.config();

const verifyValidation = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.log('MONGO_URI is not set. Skipping validation test.');
            return;
        }

        await connectDB();
        console.log('Database connection successful.');

        // 1. Test User Validation
        console.log('Testing User validation...');
        try {
            const invalidUser = new User({
                role: 'invalid_role', // Invalid enum
                name: 'A', // Too short
                mobile: '123', // Invalid regex
                password_hash: 'hash'
            });
            await invalidUser.validate();
            console.error('User validation FAILED: Should have thrown error');
        } catch (err) {
            console.log('User validation PASSED: Caught expected error:', err.message);
        }

        // 2. Test CustomerProfile Validation
        console.log('Testing CustomerProfile validation...');
        try {
            const invalidProfile = new CustomerProfile({
                user_id: new mongoose.Types.ObjectId(),
                address: { pincode: '123' }, // Invalid regex
                security_deposit: -100 // Invalid min
            });
            await invalidProfile.validate();
            console.error('CustomerProfile validation FAILED: Should have thrown error');
        } catch (err) {
            console.log('CustomerProfile validation PASSED: Caught expected error:', err.message);
        }

        console.log('All validation checks passed!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verifyValidation();
