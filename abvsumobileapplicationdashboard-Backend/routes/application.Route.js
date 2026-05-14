const express = require("express");
const {
  createApp,
  allApp,
  getApp,
  updatePayment,
  generateDoc,
  uploadSupportingDocument,
  sendDoc,
  ViewDocument,
  updateApp,
  deleteApp,
  allAppStudent,
  ViewDocumentForStudent,
  getSupportingDocument,
  getSupportingDocumentAdmin,
  createCashApplication,
  createCashApplicationAndGenerateDoc,
  printDoc
} = require("../controllers/application.Controller");
const {
  verifyToken,
  checkPermission,
  verifyStudentToken,
} = require("../middlewares/auth");
const { uploadPDF } = require("../middlewares/multer");

const router = express.Router();

// CRUD Routes
router.post("/", verifyStudentToken, createApp); // Create New Application

router.post(
  "/upload-doc/:id",
  verifyStudentToken,
  uploadPDF.single("file"),
  uploadSupportingDocument
); // Upload supporting document

router.get("/get-upload-doc/:id", verifyStudentToken, getSupportingDocument); // Get supporting document
router.get("/get-upload-doc-admin/:id", verifyToken, checkPermission("Certificate Management", "view"), getSupportingDocumentAdmin); // Get supporting document

router.get(
  "/",
  verifyToken,
  checkPermission("Certificate Management", "view"),
  allApp
); // Get all

router.post("/create-cash-app", verifyToken,checkPermission("Certificate Management", "update"),checkPermission("Payment Management", "update"), createCashApplication); // Create Cash Application

router.post("/create-cash-app-generate", verifyToken,checkPermission("Certificate Management", "update"), checkPermission("Payment Management", "update"),createCashApplicationAndGenerateDoc); // Create Cash Application and Generate Document

router.get("/student", verifyStudentToken, allAppStudent); // Get all for students

router.get(
  "/:id",
  verifyToken,
  checkPermission("Certificate Management", "view"),
  getApp
); // Get one

router.post(
  "/payment",
  verifyToken,
  checkPermission("Payment Management", "update"),
  updatePayment
); // Update payment status

router.post(
  "/generate-doc/:id",
  verifyToken,
  checkPermission("Certificate Management", "update"),
  generateDoc
);

router.get(
  "/send-doc/:id",
  verifyToken,
  checkPermission("Certificate Management", "update"),
  sendDoc
);

router.get(
  "/preview-doc/:id",
  verifyToken,
  checkPermission("Certificate Management", "view"),
  ViewDocument
); // For Admin

// Print Document - For Admin
router.get(
  "/print-doc/:id",
  verifyToken,
  checkPermission("Certificate Management", "view"),
  printDoc
); 
router.get("/view-doc/:id", verifyStudentToken, ViewDocumentForStudent); // For student to view

router.put(
  "/:id",
  verifyToken,
  checkPermission("Certificate Management", "update"),
  updateApp
);

router.delete(
  "/:id",
  verifyToken,
  checkPermission("Certificate Management", "delete"),
  deleteApp
);

module.exports = router;
