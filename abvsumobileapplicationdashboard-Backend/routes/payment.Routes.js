const express = require("express");
const router = express.Router();
const {
  createOrder,
  storePaymentForm,
  renderPaymentForm,
  verifyDocs,
  verifyPayment,
  getAllPayment,
} = require("../controllers/payment.Controller");
const {
  verifyToken,
  checkPermission,
  verifyStudentToken,
} = require("../middlewares/auth");

router.get(
  "/",
  verifyToken,
  checkPermission("Payment Management", "view"),
  getAllPayment,
);
router.post("/create-order", verifyStudentToken, createOrder);
router.post("/form", verifyStudentToken, storePaymentForm);
router.get("/form/:token", renderPaymentForm);
router.post("/verify-payment", verifyPayment);
router.post("/verify-docs", verifyDocs);

module.exports = router;
