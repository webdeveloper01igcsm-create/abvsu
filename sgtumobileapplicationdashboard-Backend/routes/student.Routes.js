const express = require("express"); // Admin Routes
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  allStudent,
  verifyOtp,
  addStudent,
  editStudent,
  deleteStudent,
  toggleStudentStatus,
  getStudentDetails,
  getStudentSessionState,
  sendAadhaarAddressOtp,
  verifyAadhaarAddressOtp,
  submitUndertaking,
  createLicenseRenewalOrder,
  handleLicenseRazorpayResponse,
} = require("../controllers/student.Controller");
const {
  verifyToken,
  checkPermission,
  verifyStudentToken,
} = require("../middlewares/auth");
const {
  otpSendLimiter,
  otpVerifyLimiter,
} = require("../middlewares/rateLimit");
const {
  documentupload,
  documentview,
  photoUpload,
  photoView,
} = require("../controllers/document.Controller");
const {
  uploadPDF,
  uploadImage,
  uploadSignature,
} = require("../middlewares/multer");
const {
  createOrder,
  verifyPayment,
  payments,
} = require("../controllers/subscription.Controller");

// Student Auth
router.post("/register", registerStudent);
router.post("/verifyOtp", verifyOtp);
router.post("/login", loginStudent);
router.get("/verify", verifyStudentToken, (req, res) => {
  return res.json({ message: "Access granted!", user: req.user });
});

// Student Details
router.get("/profile", verifyStudentToken, getStudentDetails);
router.get("/session-state", verifyStudentToken, getStudentSessionState);

// Aadhaar address routes
router.post(
  "/aadhaar-address/send-otp",
  verifyStudentToken,
  otpSendLimiter,
  sendAadhaarAddressOtp,
);
router.post(
  "/aadhaar-address/verify-otp",
  verifyStudentToken,
  otpVerifyLimiter,
  verifyAadhaarAddressOtp,
);
router.post(
  "/undertaking",
  verifyStudentToken,
  uploadSignature.single("signature"),
  submitUndertaking,
);
router.post(
  "/license/create-order",
  verifyStudentToken,
  createLicenseRenewalOrder,
);
router.post("/license-razorpay-response", handleLicenseRazorpayResponse);

// Student Docs
router.post(
  "/document-upload",
  verifyStudentToken,
  uploadPDF.single("file"),
  documentupload,
);
router.get("/document-download", verifyToken, documentview);
router.post(
  "/photo-upload",
  verifyStudentToken,
  uploadImage.single("file"),
  photoUpload,
);
router.get("/photo-download", verifyStudentToken, photoView);

// Student Subscription and Payment
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/payments", payments);


router.get(
  "/all",
  verifyToken,
  checkPermission("Student Management", "view"),
  allStudent,
);
router.post(
  "/add",
  verifyToken,
  checkPermission("Student Management", "write"),
  addStudent,
);
router.patch(
  "/update/:id",
  verifyToken,
  checkPermission("Student Management", "update"),
  editStudent,
);
router.delete(
  "/delete/:id",
  verifyToken,
  checkPermission("Student Management", "delete"),
  deleteStudent,
);
router.post(
  "/status",
  verifyToken,
  checkPermission("Student Management", "update"),
  toggleStudentStatus,
);

module.exports = router;
