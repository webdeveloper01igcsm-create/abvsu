const express = require("express");
const {
  sendOtp,
  verifyOtp,
  applyForCharacterCertificate,
  handleRazorpayResponse,
  getMyRecords,
  getAllRecords,
  updateRecord,
  uploadGeneratedFile,
  downloadGeneratedFile,
  retryPayment,
  getPaymentSlip,
} = require("../controllers/characterCertificate.Controller");
const {
  verifyStudentToken,
  verifyToken,
  checkPermission,
} = require("../middlewares/auth");
const { uploadPDF } = require("../middlewares/multer");

const router = express.Router();

const uploadDocuments = uploadPDF.fields([
  { name: "marksheetFile", maxCount: 1 },
]);

// Student routes
router.post("/send-otp", verifyStudentToken, sendOtp);
router.post("/verify-otp", verifyStudentToken, verifyOtp);
router.post(
  "/apply",
  verifyStudentToken,
  uploadDocuments,
  applyForCharacterCertificate,
);
router.post("/razorpay-response", handleRazorpayResponse);
router.get("/my", verifyStudentToken, getMyRecords);
router.get("/:id/payment-slip", verifyStudentToken, getPaymentSlip);
router.get("/:id/download", verifyStudentToken, downloadGeneratedFile);
router.post("/:id/retry-payment", verifyStudentToken, retryPayment);

// Admin routes
router.get(
  "/",
  verifyToken,
  checkPermission("Character Certificate Management", "view"),
  getAllRecords,
);
router.put(
  "/:id",
  verifyToken,
  checkPermission("Character Certificate Management", "update"),
  updateRecord,
);
router.post(
  "/:id/generated-file",
  verifyToken,
  checkPermission("Character Certificate Management", "update"),
  uploadPDF.single("file"),
  uploadGeneratedFile,
);

module.exports = router;
