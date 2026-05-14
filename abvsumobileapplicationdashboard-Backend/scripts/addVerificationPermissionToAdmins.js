/**
 * Script to add Student Verification Management permission to all existing admin users
 * Usage: node scripts/addVerificationPermissionToAdmins.js
 *
 * This ensures all admin users can see and manage student verification requests
 */

const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const addVerificationPermissionToAdmins = async () => {
  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/mobiledashboard",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );

    console.log("✓ Connected to MongoDB");

    // Find all admin and superadmin users
    const admins = await User.find({
      role: { $in: ["admin", "superadmin"] },
    });

    if (admins.length === 0) {
      console.log("ℹ No admin users found");
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Found ${admins.length} admin user(s)`);

    // Add "Student Verification Management" permission to each admin
    for (const admin of admins) {
      const existingPermission = admin.permissions?.find(
        (p) => p.module === "Student Verification Management",
      );

      if (!existingPermission) {
        admin.permissions.push({
          module: "Student Verification Management",
          view: true,
          write: true,
          update: true,
          delete: true,
        });
        await admin.save();
        console.log(`✓ Added permission for: ${admin.email}`);
      } else {
        console.log(`ℹ Permission already exists for: ${admin.email}`);
      }
    }

    console.log(
      "✓ All admin users now have Student Verification Management permission",
    );
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

addVerificationPermissionToAdmins();
