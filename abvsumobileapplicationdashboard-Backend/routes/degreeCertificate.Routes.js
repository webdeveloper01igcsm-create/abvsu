const express = require("express");
const {
  applyForDegreeCertificate,
  handleRazorpayResponse,
  getMyRecords,
  getAllRecords,
  updateRecord,
  uploadGeneratedFile,
  downloadGeneratedFile,
  retryPayment,
  getPaymentSlip,
} = require("../controllers/degreeCertificate.Controller");
const {
  verifyStudentToken,
  verifyToken,
  checkPermission,
} = require("../middlewares/auth");
const { uploadPDF } = require("../middlewares/multer");

const router = express.Router();

// Student routes
router.post(
  "/apply",
  verifyStudentToken,
  uploadPDF.none(),
  applyForDegreeCertificate,
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
  checkPermission("Degree Certificate Management", "view"),
  getAllRecords,
);
router.put(
  "/:id",
  verifyToken,
  checkPermission("Degree Certificate Management", "update"),
  updateRecord,
);
router.post(
  "/:id/generated-file",
  verifyToken,
  checkPermission("Degree Certificate Management", "update"),
  uploadPDF.single("file"),
  uploadGeneratedFile,
);

module.exports = router;
