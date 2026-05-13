/**
 * Grant full module permissions to all superadmin users.
 *
 * Usage:
 *   node scripts/grantSuperadminAllPermissions.js
 */

const mongoose = require("mongoose");
const { permissionModules } = require("../constants/permissionModules");
require("dotenv").config();

const toBool = (value) => Boolean(value);

const buildPermissionMatrix = () =>
  permissionModules.map((moduleName) => ({
    _id: new mongoose.Types.ObjectId(),
    module: moduleName,
    view: true,
    write: true,
    update: true,
    delete: true,
  }));

const existingIsFullAccess = (permissions) => {
  if (
    !Array.isArray(permissions) ||
    permissions.length !== permissionModules.length
  ) {
    return false;
  }

  const permissionByModule = new Map();

  for (const perm of permissions) {
    const moduleName = String(perm?.module || "").trim();
    if (!permissionModules.includes(moduleName)) {
      return false;
    }
    permissionByModule.set(moduleName, {
      view: toBool(perm?.view),
      write: toBool(perm?.write),
      update: toBool(perm?.update),
      delete: toBool(perm?.delete),
    });
  }

  for (const moduleName of permissionModules) {
    const perm = permissionByModule.get(moduleName);
    if (!perm) return false;
    if (!perm.view || !perm.write || !perm.update || !perm.delete) {
      return false;
    }
  }

  return true;
};

const grantSuperadminAllPermissions = async () => {
  let connection;

  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/mobiledashboard";
    connection = await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const usersCollection = connection.connection.collection("users");
    const superadmins = await usersCollection
      .find({ role: "superadmin" })
      .toArray();

    console.log(`Found ${superadmins.length} superadmin user(s)`);

    if (superadmins.length === 0) {
      console.log("No superadmin users found. Nothing to update.");
      process.exit(0);
    }

    let updated = 0;
    let unchanged = 0;

    for (const user of superadmins) {
      const alreadyFull = existingIsFullAccess(user.permissions);
      if (alreadyFull) {
        unchanged += 1;
        console.log(`Unchanged: ${user.email}`);
        continue;
      }

      const fullPermissions = buildPermissionMatrix();

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { permissions: fullPermissions } },
      );

      updated += 1;
      console.log(`Updated: ${user.email}`);
    }

    console.log("\nDone");
    console.log(`Scanned: ${superadmins.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${unchanged}`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to grant permissions:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
    }
  }
};

grantSuperadminAllPermissions();
