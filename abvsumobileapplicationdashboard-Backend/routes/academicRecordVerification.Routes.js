const express = require("express");
const {
  sendOtp,
  verifyOtp,
  applyForVerification,
  handleRazorpayResponse,
  getMyRecords,
  getAllRecords,
  updateRecord,
  uploadGeneratedFile,
  downloadGeneratedFile,
  retryPayment,
  getPaymentSlip,
} = require("../controllers/academicRecordVerification.Controller");
const {
  verifyStudentToken,
  verifyToken,
  checkPermission,
} = require("../middlewares/auth");
const { uploadPDF } = require("../middlewares/multer");

const router = express.Router();

const uploadDocuments = uploadPDF.fields([
  { name: "mergedDocumentsFile", maxCount: 1 },
  { name: "marksheetFile", maxCount: 1 },
  { name: "provisionalFile", maxCount: 1 },
  { name: "degreeFile", maxCount: 1 },
  { name: "transcriptFile", maxCount: 1 },
]);

// Student routes
router.post("/send-otp", verifyStudentToken, sendOtp);
router.post("/verify-otp", verifyStudentToken, verifyOtp);
router.post(
  "/apply",
  verifyStudentToken,
  uploadDocuments,
  applyForVerification,
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
  checkPermission("Student Verification Management", "view"),
  getAllRecords,
);
router.put(
  "/:id",
  verifyToken,
  checkPermission("Student Verification Management", "update"),
  updateRecord,
);
router.post(
  "/:id/generated-file",
  verifyToken,
  checkPermission("Student Verification Management", "update"),
  uploadPDF.single("file"),
  uploadGeneratedFile,
);

module.exports = router;
