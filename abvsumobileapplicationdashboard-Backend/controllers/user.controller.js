const User = require("../models/User");
const { z } = require("zod");
const { permissionModules } = require("../constants/permissionModules");

const permissionSchema = z.object({
  module: z.enum(permissionModules),
  view: z.boolean().default(false),
  write: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false),
});

const userSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).optional(),
  active: z.boolean().optional(),
  permissions: z.array(permissionSchema).optional(),
});

// Add User
const addUser = async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const newUser = new User(validatedData);
    await newUser.save();
    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    if ( req.body.role === 'superadmin') {
      return res.status(403).json({ success: false, message: "Updating role to superadmin is not allowed" });
    }
    const validatedData = userSchema.partial().parse(req.body); // Partial for update
    const user = await User.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { addUser, getAllUsers, updateUser, deleteUser };