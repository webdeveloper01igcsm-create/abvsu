const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { z } = require("zod");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body || {};
    const configuredOtp = String(process.env.ADMIN_OTP || "").trim();

    if (!otp) return res.status(400).json({ message: "OTP is required" });
    if (!configuredOtp) {
      return res.status(503).json({
        message: "OTP verification is not configured",
      });
    }

    if (String(otp).trim() !== configuredOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    return res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

const paswordSchema = z.object({
  password: z.string().min(6, "Minimum 6 Digit password is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    loginSchema.parse({ email, password });
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect || !user.active) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );
    res.status(200).json({
      token,
      message: "Login successful",
      permissions: user.permissions,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: err.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetpassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword)
      return res.status(400).json({
        success: false,
        message: "New Password and confirm password does not match",
      });
    paswordSchema.parse({ password: newPassword });
    const { email, userId } = req.user;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Your password does not match" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
      },
      {
        new: true,
        runValidators: true,
      },
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.errors) {
      return res
        .status(400)
        .json({ success: false, message: err.errors[0].message });
    }
    return res
      .status(400)
      .json({ success: false, message: "Failed to Update password" });
  }
};

module.exports = { login, resetpassword, verifyOtp };
