const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

async function addChatSupportPermission() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    const adminUsers = await User.find({
      role: { $in: ["admin", "superadmin"] },
    });

    console.log(`Found ${adminUsers.length} admin/superadmin users`);

    let updated = 0;
    for (const user of adminUsers) {
      const hasPermission = user.permissions.some(
        (perm) => perm.module === "Chat Support",
      );

      if (!hasPermission) {
        user.permissions.push({
          module: "Chat Support",
          view: true,
          write: true,
          update: true,
          delete: true,
        });

        await user.save();
        console.log(`✅ Added Chat Support permission to: ${user.email}`);
        updated++;
      } else {
        console.log(
          `⏭️  User ${user.email} already has Chat Support permission`,
        );
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updated} user(s)`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addChatSupportPermission();
