const mongoose = require("mongoose");
require("dotenv").config();

async function addCourseCompletionCertificatePermission() {
  let connection;
  try {
    connection = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    const usersCollection = connection.connection.collection("users");
    const adminUsers = await usersCollection
      .find({
        role: { $in: ["superadmin"] },
      })
      .toArray();

    console.log(`Found ${adminUsers.length} admin/superadmin users`);

    let updated = 0;
    let sanitizedUsers = 0;

    const isValidObjectId = (value) => {
      if (!value) return false;
      return mongoose.Types.ObjectId.isValid(String(value));
    };

    for (const user of adminUsers) {
      const permissions = Array.isArray(user.permissions)
        ? user.permissions
        : [];
      let userSanitized = false;

      const normalizedPermissions = permissions.map((perm) => {
        const normalized = {
          _id: isValidObjectId(perm?._id)
            ? new mongoose.Types.ObjectId(String(perm._id))
            : new mongoose.Types.ObjectId(),
          module: perm?.module || "",
          view: !!perm?.view,
          write: !!perm?.write,
          update: !!perm?.update,
          delete: !!perm?.delete,
        };

        if (!isValidObjectId(perm?._id)) {
          userSanitized = true;
        }

        return normalized;
      });

      const hasPermission = normalizedPermissions.some(
        (perm) => perm.module === "Provisional Degree Certificate Management",
      );

      if (!hasPermission) {
        normalizedPermissions.push({
          _id: new mongoose.Types.ObjectId(),
          module: "Provisional Degree Certificate Management",
          view: true,
          write: true,
          update: true,
          delete: true,
        });

        userSanitized = true;
        updated++;
        console.log(
          `✅ Added Course Completion Certificate Management permission to: ${user.email}`,
        );
      } else {
        console.log(
          `⏭️  User ${user.email} already has Course Completion Certificate Management permission`,
        );
      }

      if (userSanitized) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { permissions: normalizedPermissions } },
        );
        sanitizedUsers++;
      }
    }

    console.log(
      `\n✅ Migration complete! Updated ${updated} user(s), sanitized ${sanitizedUsers} user(s).`,
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
    }
  }
}

addCourseCompletionCertificatePermission();
