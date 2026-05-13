const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  addStudentResult,
  generateResults,
  getStudentResult,
  downloadMarksheet,
  studentVerify,
  getResult,
  deleteResult,
  resultVisiblity,
} = require("../controllers/result.Controller");

const { uploadPDF } = require("../middlewares/multer");

const {
  checkPermission,
  verifyToken,
  verifyStudentToken,
} = require("../middlewares/auth");

const publicVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification requests. Please try again later.",
  },
});

router.get("/verify/:id", publicVerifyLimiter, studentVerify);

// View result (view)
router.get(
  "/:id",
  verifyToken,
  checkPermission("Result Management", "view"),
  getResult,
);

// View result for Student (view)
router.get(
  "/generate-pdf/:studentId/:semesterNumber",
  verifyToken,
  checkPermission("Result Management", "view"),
  downloadMarksheet,
);

// Student Token Verify and result for student
router.get("/student/:id", verifyStudentToken, getStudentResult);

// Update Result (update)
router.post(
  "/",
  verifyToken,
  checkPermission("Result Management", "update"),
  uploadPDF.single("file"),
  addStudentResult,
);

// Generate result (write)
router.post(
  "/generate",
  verifyToken,
  checkPermission("Result Management", "write"),
  generateResults,
);

// Result visiblity (update)
router.patch(
  "/visiblity",
  verifyToken,
  checkPermission("Result Management", "update"),
  resultVisiblity,
);

// Delete result (delete)
router.delete(
  "/:studentId/:semesterNumber",
  verifyToken,
  checkPermission("Result Management", "delete"),
  deleteResult,
);

module.exports = router;
