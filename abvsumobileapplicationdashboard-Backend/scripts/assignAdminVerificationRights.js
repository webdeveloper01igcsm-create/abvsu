/**
 * Script to assign Student Verification Management rights to an admin user
 * Usage: node assignAdminVerificationRights.js <admin_email>
 *
 * Example: node assignAdminVerificationRights.js admin@sgtu.ac.in
 */

const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const assignVerificationRights = async (adminEmail) => {
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

    // Find the user
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.error(`✗ User not found: ${adminEmail}`);
      process.exit(1);
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      console.error(`✗ User is not an admin. Current role: ${user.role}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.name} (${user.email})`);

    // Check if permission already exists
    const existingPermission = user.permissions.find(
      (p) => p.module === "Student Verification Management",
    );

    if (existingPermission) {
      console.log(
        "✓ User already has Student Verification Management permissions",
      );

      // Update to ensure full permissions
      existingPermission.view = true;
      existingPermission.write = true;
      existingPermission.update = true;
      existingPermission.delete = true;
    } else {
      // Add new permission
      user.permissions.push({
        module: "Student Verification Management",
        view: true,
        write: true,
        update: true,
        delete: true,
      });
    }

    // Save updated user
    await user.save();

    console.log("✓ Permissions assigned successfully!");
    console.log("\nPermissions granted:");
    console.log("  - VIEW: Yes");
    console.log("  - WRITE: Yes");
    console.log("  - UPDATE: Yes");
    console.log("  - DELETE: Yes");

    await mongoose.connection.close();
    console.log("\n✓ Database connection closed");
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
};

// Get email from command line arguments
const adminEmail = process.argv[2];

if (!adminEmail) {
  console.error("Usage: node assignAdminVerificationRights.js <admin_email>");
  console.error("\nExample:");
  console.error("  node assignAdminVerificationRights.js admin@sgtu.ac.in");
  process.exit(1);
}

assignVerificationRights(adminEmail);
