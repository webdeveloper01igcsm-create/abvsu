const express = require("express");
const {
  createDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
} = require("../controllers/academicDoc.Controller");
const { checkPermission, verifyToken } = require("../middlewares/auth");

const router = express.Router();

// CRUD Routes
router.post("/", verifyToken, checkPermission("Certificate Management", "write"), createDoc);
router.get("/", getDocs); // Publicly accessible route
router.get("/:id", verifyToken, checkPermission("Certificate Management", "view"), getDoc);
router.put("/:id", verifyToken, checkPermission("Certificate Management", "update"), updateDoc);
router.delete("/:id", verifyToken, checkPermission("Certificate Management", "delete"), deleteDoc);

module.exports = router;