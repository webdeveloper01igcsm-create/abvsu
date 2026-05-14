const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jsonError } = require("../utils/apiResponse");
require("dotenv").config();

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  // console.log(token);

  if (!token) {
    return jsonError(res, 401, "Access denied.");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return jsonError(res, 404, "User not found");
    }
    if (!user.active) {
      return jsonError(res, 401, "Access denied.");
    }
    next();
  } catch (err) {
    return jsonError(res, 403, "Invalid or expired token. Access denied.");
  }
};

const verifyStudentToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return jsonError(res, 401, "Access denied.");
  }
  try {
    const decoded = jwt.verify(token, process.env.STUDENT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return jsonError(res, 403, "Invalid or expired token. Access denied.");
  }
};

const generateToken = (payload, expiresIn = "2h") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const checkRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        role: req.user.role,
      });
    }
    next();
  };
};

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        console.warn("No userId in token");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await User.findById(req.user.userId).select(
        "role permissions",
      );
      if (!user) {
        console.warn("User not found:", req.user.userId);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(
        `Checking permission: Module="${module}", Action="${action}", Role="${user.role}"`,
      );
      console.log(
        `User permissions:`,
        user.permissions?.map((p) => p.module),
      );

      if (user.role === "superadmin") {
        console.log("Superadmin - allowing all access");
        return next();
      }

      const permission = user.permissions?.find(
        (perm) => perm.module === module,
      );
      console.log(`Found permission for "${module}":`, permission);

      if (!permission || !permission[action]) {
        console.warn(`Missing permission: ${module}.${action}`);
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`Permission granted: ${module}.${action}`);
      next();
    } catch (error) {
      console.error("Permission check error:", error.message);
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = {
  verifyToken,
  generateToken,
  checkPermission,
  checkRole,
  verifyStudentToken,
};
