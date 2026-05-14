const express = require("express");
const router = express.Router();
const {
  generateIDCard,
  bulkGenerateIDCards,
  getAllIDCards,
  getStudentIDCard,
  toggleVisibility,
  deleteIDCard,
  downloadIDCard,
  downloadIDCardAdmin,
} = require("../controllers/idCard.Controller");
const {
  verifyToken,
  checkPermission,
  verifyStudentToken,
} = require("../middlewares/auth");
const { uploadImage } = require("../middlewares/multer");
const multer = require("multer");

// Multer configuration for CSV/Excel bulk upload
const uploadBulk = multer({
  dest: "uploads/",
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".xlsx", ".xls", ".csv"];
    const ext = file.originalname
      .substring(file.originalname.lastIndexOf("."))
      .toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(
        new Error("Only Excel files (.xlsx, .xls, .csv) are allowed"),
        false,
      );
    }
    cb(null, true);
  },
});

// Admin routes
router.post(
  "/generate",
  verifyToken,
  checkPermission("ID Card Management", "write"),
  uploadImage.single("photo"),
  generateIDCard,
);
router.post(
  "/bulk-generate",
  verifyToken,
  checkPermission("ID Card Management", "write"),
  uploadBulk.single("file"),
  bulkGenerateIDCards,
);
router.get(
  "/all",
  verifyToken,
  checkPermission("ID Card Management", "view"),
  getAllIDCards,
);
router.patch(
  "/:id/toggle-visibility",
  verifyToken,
  checkPermission("ID Card Management", "write"),
  toggleVisibility,
);
router.delete(
  "/:id",
  verifyToken,
  checkPermission("ID Card Management", "write"),
  deleteIDCard,
);
router.get(
  "/:id/download",
  verifyToken,
  checkPermission("ID Card Management", "view"),
  downloadIDCardAdmin,
);

// Student routes
router.get("/my-card", verifyStudentToken, getStudentIDCard);
router.get("/download", verifyStudentToken, downloadIDCard);

module.exports = router;
