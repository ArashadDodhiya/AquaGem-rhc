console.log("🟦 DEBUG: Script started.");

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

console.log("🟦 DEBUG: Environment loaded.");

const modelsToTest = [
  "User",
  "CustomerProfile",
  "Route",
  "Delivery",
  "JarTransaction",
  "Invoice",
  "Payment",
  "Product",
  "Ticket",
  "Notification",
  "OtpRequest",
  "AuditLog",
  "VendingTransaction",
  "JarInventory",
  "ReportCache",
];

(async () => {
  try {
    console.log("🟦 DEBUG: Connecting to DB...");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("🟩 DEBUG: Connected to DB.\n");

    for (const modelName of modelsToTest) {
      console.log(`➡️ Attempting to load model: ${modelName}`);
      try {
        const model = await import(`../models/${modelName}.js`);
        console.log(`   ✅ Loaded model: ${modelName}\n`);
      } catch (err) {
        console.error(`   ❌ ERROR loading ${modelName}: ${err.message}`);
        console.log("‼ THIS MODEL IS FAILING DURING LOAD");
        process.exit(1);
      }
    }

    console.log("🎉 ALL MODELS LOADED WITHOUT ERROR");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ FATAL ERROR:", err.message);
    process.exit(1);
  }
})();
