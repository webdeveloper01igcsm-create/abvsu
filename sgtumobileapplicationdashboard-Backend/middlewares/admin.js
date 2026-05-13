const User = require("../models/User");

async function checkAndCreateSuperAdmin() {
  try {
    console.log("Checking for superadmin...");
    const superAdmin = await User.findOne({ role: "superadmin" });
    if (!superAdmin) {
      console.log("Superadmin not found, creating one...");

      const permissions = [
        "Session Management",
        "Course Type Management",
        "Course Management",
        "Student Management",
        "Result Management",
        "User Management",
        "Notification Management",
        "Bulk Upload",
        "Count Management",
        "Video Verification Management",
        "Certificate Management",
        "Payment Management",
        "ID Card Management",
        "Chat Support",
        "Student Verification Management",
        "Character Certificate Management",
        "Migration Certificate Management",
        "Course Completion Certificate Management",
        "Provisional Degree Certificate Management",
        "Transcript Certificate Management",
        "Duplicate Document Management",
      ].map((module) => ({
        module,
        view: true,
        write: true,
        update: true,
        delete: true,
      }));

      const newSuperAdmin = new User({
        name: "superadmin",
        email: "admin@admin.com",
        active: true,
        password: "securepassword123",
        role: "superadmin",
        permissions,
      });

      await newSuperAdmin.save();
      console.log("Superadmin created successfully with all permissions.");
    } else {
      console.log("Superadmin already exists.");
    }
  } catch (error) {
    console.error("Error while checking/creating superadmin:", error);
  }
}

module.exports = checkAndCreateSuperAdmin;
