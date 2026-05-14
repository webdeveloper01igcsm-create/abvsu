const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createDegreeVerification,
  handleRazorpayResponse,
  getPaymentSlip,
  getVerificationStatus,
  getAllDegreeVerifications,
  updateVerificationStatus,
  validateDegreeVerification,
} = require("../controllers/degreeVerification.Controller");
const { verifyToken, checkPermission } = require("../middlewares/auth");

const router = express.Router();

// Rate limiting for public endpoints (2 requests per 15 minutes per IP)
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2, // Max 2 requests per window
  message:
    "Too many verification applications from this IP. Please try again after 15 minutes.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Don't rate limit for callback responses
    return req.path === "/razorpay-response";
  },
});

// PUBLIC ROUTES (No Authentication Required)
router.post(
  "/apply",
  verificationLimiter,
  validateDegreeVerification,
  createDegreeVerification,
); // Create verification application with rate limiting & validation
router.post("/razorpay-response", handleRazorpayResponse); // Handle payment gateway response (not rate limited)
router.get("/payment-slip/:orderId", getPaymentSlip); // Download payment slip
router.get("/status/:orderId", getVerificationStatus); // Check verification status

// ADMIN ROUTES (Authentication Required)
router.get(
  "/all",
  verifyToken,
  checkPermission("Verification Management", "view"),
  getAllDegreeVerifications,
); // Get all verifications

router.put(
  "/update-status/:id",
  verifyToken,
  checkPermission("Verification Management", "update"),
  updateVerificationStatus,
); // Update verification status

module.exports = router;
