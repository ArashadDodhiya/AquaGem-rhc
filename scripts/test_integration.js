// scripts/test_integration.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Import all models
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

const createdIds = {};

async function safeCreate(label, createFn) {
  console.log(`➡️ Creating ${label}...`);
  try {
    const doc = await createFn();
    console.log(`✅ ${label} created: ${doc._id}`);
    return doc;
  } catch (err) {
    // Provide a helpful error message
    console.error(`\n❌ ERROR creating ${label}:`, err.message || err);
    if (err && err.errors) {
      Object.keys(err.errors).forEach(k => {
        console.error(`   - ${k}: ${err.errors[k].message}`);
      });
    }
    // Rethrow so caller can stop and cleanup
    throw { label, error: err };
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  // delete in reverse-ish order to reduce FK-like surprises
  const order = [
    'report', 'inventory', 'vendingTxn', 'otpInfo', 'auditLog', 'notification',
    'ticket', 'payment', 'invoice', 'jarTxn', 'delivery', 'product',
    'customerProfile', 'route', 'customerUser', 'deliveryBoy', 'admin'
  ];

  for (const key of order) {
    if (!createdIds[key]) continue;
    const id = createdIds[key];
    try {
      switch (key) {
        case 'admin':
        case 'deliveryBoy':
        case 'customerUser':
          await User.findByIdAndDelete(id);
          break;
        case 'route':
          await Route.findByIdAndDelete(id);
          break;
        case 'customerProfile':
          await CustomerProfile.findByIdAndDelete(id);
          break;
        case 'product':
          await Product.findByIdAndDelete(id);
          break;
        case 'delivery':
          // Option B: Deliveries are immutable but deletable — try deletion
          await Delivery.findByIdAndDelete(id);
          break;
        case 'jarTxn':
          await JarTransaction.findByIdAndDelete(id);
          break;
        case 'invoice':
          await Invoice.findByIdAndDelete(id);
          break;
        case 'payment':
          await Payment.findByIdAndDelete(id);
          break;
        case 'ticket':
          await Ticket.findByIdAndDelete(id);
          break;
        case 'notification':
          await Notification.findByIdAndDelete(id);
          break;
        case 'auditLog':
          await AuditLog.findByIdAndDelete(id);
          break;
        case 'otpInfo':
          await OtpRequest.findByIdAndDelete(id);
          break;
        case 'vendingTxn':
          await VendingTransaction.findByIdAndDelete(id);
          break;
        case 'inventory':
          await JarInventory.findByIdAndDelete(id);
          break;
        case 'report':
          await ReportCache.findByIdAndDelete(id);
          break;
        default:
          // fallback: try to delete from any collection
          try {
            await mongoose.connection.db.collection(key).deleteOne({ _id: id });
          } catch (e) {
            // ignore
          }
      }
      console.log(`   ✖ ${key} (${id}) deleted`);
    } catch (err) {
      console.warn(`   ⚠ Failed deleting ${key} (${id}): ${err.message || err}`);
    }
  }

  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected!');
  } catch (e) {
    console.warn('Warning while disconnecting:', e.message || e);
  }
}

const testIntegration = async () => {
  try {
    console.log('🔄 Connecting to Database...');
    await connectDB();
    console.log('✅ Database Connected');

    console.log('\n🧪 Starting Integration Test (Creating Linked Documents)...');

    // 1. Create Users (Admin, Delivery Boy, Customer)
    const adminUser = await safeCreate('User (Admin)', () =>
      User.create({
        role: 'admin',
        name: 'Test Admin',
        mobile: '9999999999',
        password_hash: 'hashed_secret',
        is_active: true
      })
    );
    createdIds.admin = adminUser._id;

    const deliveryBoy = await safeCreate('User (Delivery Boy)', () =>
      User.create({
        role: 'delivery_boy',
        name: 'Test Setup DBoy',
        mobile: '8888888888',
        password_hash: 'hashed_secret',
        is_active: true
      })
    );
    createdIds.deliveryBoy = deliveryBoy._id;

    const customerUser = await safeCreate('User (Customer)', () =>
      User.create({
        role: 'customer',
        name: 'Test Customer',
        mobile: '7777777777',
        password_hash: 'hashed_secret',
        is_active: true
      })
    );
    createdIds.customerUser = customerUser._id;

    // 2. Create Route
    const route = await safeCreate('Route', () =>
      Route.create({
        route_name: 'Test Route A',
        assigned_delivery_boy: deliveryBoy._id,
        areas: ['Test Area 1', 'Test Area 2']
      })
    );
    createdIds.route = route._id;

    // 3. Create Customer Profile
    const customerProfile = await safeCreate('CustomerProfile', () =>
      CustomerProfile.create({
        user_id: customerUser._id,
        address: {
          flat: '101',
          building: 'Test Heights',
          society: 'Test Society',
          area: 'Test Area 1',
          city: 'Test City',
          pincode: '123456',
          geo: { type: 'Point', coordinates: [72.8, 19.2] }
        },
        route_id: route._id,
        delivery_schedule: { type: 'daily' },
        security_deposit: 1000
      })
    );
    createdIds.customerProfile = customerProfile._id;

    // 4. Create Product
    const product = await safeCreate('Product', () =>
      Product.create({
        name: '20L Water Jar',
        category: 'Water',
        description: 'Standard 20L Jar'
      })
    );
    createdIds.product = product._id;

    // 5. Create Delivery
    const delivery = await safeCreate('Delivery', () =>
      Delivery.create({
        customer_id: customerProfile._id,
        delivery_boy_id: deliveryBoy._id,
        date: new Date(),
        delivered_qty: 2,
        returned_qty: 1,
        status: 'delivered',
        gps_location: { lat: 19.2, lng: 72.8 }
      })
    );
    createdIds.delivery = delivery._id;

    // 6. Create JarTransaction
    const jarTxn = await safeCreate('JarTransaction', () =>
      JarTransaction.create({
        customer_id: customerProfile._id,
        type: 'issue',
        qty: 2,
        delivery_id: delivery._id,
        remarks: 'Test Issue'
      })
    );
    createdIds.jarTxn = jarTxn._id;

    // 7. Create Invoice
    const invoice = await safeCreate('Invoice', () =>
      Invoice.create({
        customer_id: customerProfile._id,
        month: '2025-01',
        jars_delivered: 20,
        jars_returned: 18,
        amount_due: 500
      })
    );
    createdIds.invoice = invoice._id;

    // 8. Create Payment
    const payment = await safeCreate('Payment', () =>
      Payment.create({
        customer_id: customerProfile._id,
        invoice_id: invoice._id,
        method: 'upi',
        amount: 500,
        transaction_id: 'TXN_' + Date.now(),
        status: 'success'
      })
    );
    createdIds.payment = payment._id;

    // 9. Create Ticket
    const ticket = await safeCreate('Ticket', () =>
      Ticket.create({
        customer_id: customerProfile._id,
        subject: 'Test Complaint',
        message: 'This is a test ticket',
        status: 'open'
      })
    );
    createdIds.ticket = ticket._id;

    // 10. Create Notification
    const notification = await safeCreate('Notification', () =>
      Notification.create({
        customer_id: customerProfile._id,
        type: 'whatsapp',
        template: 'invoice',
        status: 'sent'
      })
    );
    createdIds.notification = notification._id;

    // 11. Create AuditLog
    const auditLog = await safeCreate('AuditLog', () =>
      AuditLog.create({
        entity: 'customer',
        entity_id: customerProfile._id,
        action: 'create',
        performed_by: adminUser._id,
        after: { test: 'data' }
      })
    );
    createdIds.auditLog = auditLog._id;

    // 12. Create Other Independent Models
    const otpInfo = await safeCreate('OtpRequest', () =>
      OtpRequest.create({
        mobile: '7777777777',
        otp: '1234',
        expires_at: new Date(Date.now() + 10 * 60000)
      })
    );
    createdIds.otpInfo = otpInfo._id;

    const vendingTxn = await safeCreate('VendingTransaction', () =>
      VendingTransaction.create({
        machine_id: 'VM_001',
        litres: 5,
        payment_method: 'coin',
        amount: 20,
        status: 'success'
      })
    );
    createdIds.vendingTxn = vendingTxn._id;

    const inventory = await safeCreate('JarInventory', () =>
      JarInventory.create({
        total_jars: 100,
        available_jars: 50,
        in_circulation: 50
      })
    );
    createdIds.inventory = inventory._id;

    const report = await safeCreate('ReportCache', () =>
      ReportCache.create({
        report_type: 'monthly_sales',
        period: '2025-01',
        data: { sales: 10000 }
      })
    );
    createdIds.report = report._id;

    console.log('\n🎉 ALL MODELS LINKED AND SAVED SUCCESSFULLY!');
  } catch (err) {
    // err may be a thrown object { label, error } from safeCreate or a generic exception
    if (err && err.label) {
      console.error(`\n‼ Integration test stopped at: ${err.label}`);
      console.error('Cause:', err.error && (err.error.message || err.error));
    } else {
      console.error('\n❌ TEST FAILED (unexpected):', err && err.message ? err.message : err);
    }
  } finally {
    await cleanup();
    process.exit(0);
  }
};

testIntegration();
