const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { permissionModules } = require("../constants/permissionModules");

const PermissionSchema = new mongoose.Schema({
  module: { type: String, enum: permissionModules, required: true },
  view: { type: Boolean, default: false },
  write: { type: Boolean, default: false },
  update: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  active: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["admin", "user", "superadmin"],
    default: "user",
  },
  permissions: [PermissionSchema],
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", UserSchema);
