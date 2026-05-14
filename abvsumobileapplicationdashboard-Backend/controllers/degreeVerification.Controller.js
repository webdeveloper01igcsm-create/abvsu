const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
  verifyRazorpaySignature,
} = require("../utils/razorpayGateway");
const Payment = require("../models/Payment");
const DegreeVerification = require("../models/DegreeVerification");
const Admission = require("../models/Admission");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Validation Rules for Degree Verification
exports.validateDegreeVerification = [
  body("enrollmentNumber")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Enrollment number is required")
    .isLength({ min: 5, max: 20 })
    .withMessage("Enrollment number must be 5-20 characters")
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage(
      "Enrollment number can only contain letters, numbers, hyphens and underscores",
    ),

  body("studentName")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Student name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Student name must be 2-100 characters")
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage("Student name can only contain letters, spaces and dots"),

  body("mode")
    .trim()
    .notEmpty()
    .withMessage("Mode is required")
    .isIn(["Normal Mode", "Express Mode"])
    .withMessage("Invalid mode selected"),

  body("captchaToken")
    .notEmpty()
    .withMessage("CAPTCHA verification is required"),
];

// Verify CAPTCHA token with Google (reCAPTCHA v2)
async function verifyCaptcha(token) {
  try {
    const axios = require("axios");
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    // reCAPTCHA v2 returns success: true/false (no score)
    return response.data.success === true;
  } catch (err) {
    console.error("CAPTCHA verification error:", err);
    return false;
  }
}

// CREATE a new degree verification application (PUBLIC - No Auth Required)
exports.createDegreeVerification = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { enrollmentNumber, studentName, mode } = req.body;

    // Verify CAPTCHA
    const captchaVerified = await verifyCaptcha(req.body.captchaToken);
    if (!captchaVerified) {
      return res.status(400).json({
        error: "CAPTCHA verification failed. Please try again.",
      });
    }

    // Sanitize inputs (already trimmed and escaped by validator)
    const sanitizedEnrollment = enrollmentNumber.toUpperCase().trim();
    const sanitizedName = studentName.trim();

    // Set amount based on validated mode
    const amount = mode === "Normal Mode" ? 1 : 5000;

    // Verify enrollment number exists with case-insensitive search
    const admission = await Admission.findOne({
      enrollmentNumber: new RegExp(`^${sanitizedEnrollment}$`, "i"),
    }).populate("student");

    if (!admission) {
      return res.status(404).json({
        error: "Enrollment number not found in our records",
      });
    }

    // Create verification application with sanitized data
    const verification = new DegreeVerification({
      enrollmentNumber: sanitizedEnrollment,
      studentName: sanitizedName,
      mode,
      amount,
    });

    // Setup Razorpay payment gateway
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    // Use secure random UUID instead of predictable Date.now()
    const order_id = `ORD${Date.now()}${crypto
      .randomUUID()
      .substring(0, 8)
      .toUpperCase()}`;
    const currency = "INR";
    const redirect_url =
      "https://api.sikkimglobaltechnicaluniversity.co.in/student-verification/razorpay-response";
    const cancel_url = "https://student.sgtu.ac.in/student-verification";
    if (!keyId || !keySecret) {
      return res
        .status(500)
        .json({ error: "Payment gateway configuration error" });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "degree-verification", local_order_id: order_id },
    });

    // Create payment record
    const payment = await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Degree Verification",
      payment_purpose: "Payment for Degree Verification",
      status_message: "Payment initiated for Degree Verification",
    });

    verification.payment = payment._id;
    await verification.save();

    const formHTML = buildRazorpayAutoSubmitHtml({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: process.env.PAYMENT_BRAND_NAME || "ABVSU",
      description: "Degree Verification",
      customerName: studentName,
      customerEmail: "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to create verification application" });
  }
};

// Handle Razorpay response for verification payments
exports.handleRazorpayResponse = async (req, res) => {
  try {
    const body = req.body || {};
    const failedOrderId =
      body?.error?.metadata?.order_id ||
      body?.error?.metadata?.razorpay_order_id ||
      "";
    const orderId = body.razorpay_order_id || failedOrderId;
    const paymentId = body.razorpay_payment_id || "";
    const signature = body.razorpay_signature || "";
    const failureMessage = String(
      body?.error?.description || body?.error?.reason || "",
    ).trim();
    const isSignatureValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!orderId) {
      return res.status(400).send("Invalid payment response");
    }

    // Verify the amount matches to prevent tampering
    // This provides additional security against webhook injection
    const payment = await Payment.findOne({ order_id: orderId });
    if (!payment) {
      console.warn(
        `Security Alert: Payment not found for order ${orderId}`,
      );
      return res.status(404).send("Payment record not found");
    }

    const orderStatus = isSignatureValid ? "Success" : "Failed";
    const transDate = new Date();

    // Update payment record with Razorpay details
    const updatedPayment = await Payment.findOneAndUpdate(
      { order_id: orderId },
      {
        tracking_id: paymentId,
        bank_ref_no: "",
        order_status: orderStatus,
        failure_message: failureMessage || "",
        payment_mode: "",
        card_name: "",
        status_code: isSignatureValid ? "200" : "400",
        status_message: isSignatureValid ? "Payment captured" : "Payment failed",
        trans_date: transDate,
        amount: payment.amount,
      },
      { new: true },
    );

    if (!payment) {
      return res.status(404).send("Payment record not found");
    }

    // Update verification application
    const verification = await DegreeVerification.findOne({
      payment: payment._id,
    });

    if (verification && orderStatus === "Success") {
      verification.status = "paid";
      verification.paymentVerified = true;
      await verification.save();

      // Generate payment slip
      const slipUrl = await generatePaymentSlip(verification, payment);
      verification.paymentSlipUrl = slipUrl;
      await verification.save();
    }

    // Redirect to success/failure page
    if (orderStatus === "Success") {
      return res.redirect(
        `https://student.sgtu.ac.in/verification-success?orderId=${orderId}`,
      );
    } else if (!isSignatureValid && !paymentId) {
      // If user cancelled, redirect back to form
      return res.redirect(
        `https://student.sgtu.ac.in/student-verification?cancelled=true`,
      );
    } else {
      // For failed payments, show failure page
      return res.redirect(
        `https://student.sgtu.ac.in/verification-failed?orderId=${orderId}&reason=${encodeURIComponent(failureMessage || "Payment failed")}`,
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing payment response");
  }
};

// GENERATE Payment Slip PDF
async function generatePaymentSlip(verification, payment) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `payment-slip-${verification._id}.pdf`;
      const uploadDir = path.join(process.cwd(), "document", "slips");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("PAYMENT CONFIRMATION SLIP", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(16)
        .text("Student Verification Payment", { align: "center" });
      doc.moveDown(2);

      // Payment Details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Receipt No: ${payment.order_id}`, { continued: false });
      doc.text(`Transaction ID: ${payment.tracking_id || "N/A"}`);
      doc.text(`Bank Ref No: ${payment.bank_ref_no || "N/A"}`);
      doc.moveDown();

      // Student Details
      doc.fontSize(14).font("Helvetica-Bold").text("Student Details:");
      doc.fontSize(12).font("Helvetica");
      doc.text(`Enrollment Number: ${verification.enrollmentNumber}`);
      doc.text(`Name: ${verification.studentName}`);
      doc.text(`Verification Mode: ${verification.mode}`);
      doc.moveDown();

      // Payment Details
      doc.fontSize(14).font("Helvetica-Bold").text("Payment Details:");
      doc.fontSize(12).font("Helvetica");
      doc.text(`Amount Paid: ₹${verification.amount}`);
      doc.text(`Payment Status: ${payment.order_status}`);
      doc.text(`Payment Mode: ${payment.payment_mode || "N/A"}`);
      doc.text(
        `Payment Date: ${new Date(payment.trans_date).toLocaleDateString("en-IN")}`,
      );
      doc.moveDown(2);

      // Footer
      doc.fontSize(10).font("Helvetica-Oblique");
      doc.text("This is a computer-generated payment slip.", {
        align: "center",
      });
      doc.text("Please keep this slip for your records.", { align: "center" });
      doc.moveDown();
      doc.text("For queries, contact: verification@sgtu.ac.in", {
        align: "center",
      });

      doc.end();

      stream.on("finish", () => {
        resolve(`/slips/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// GET Payment Slip (PUBLIC)
exports.getPaymentSlip = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ order_id: orderId });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const verification = await DegreeVerification.findOne({
      payment: payment._id,
    });
    if (!verification) {
      return res.status(404).json({ error: "Verification record not found" });
    }

    if (!verification.paymentSlipUrl) {
      return res.status(404).json({ error: "Payment slip not generated yet" });
    }

    const filePath = path.join(
      process.cwd(),
      "document",
      verification.paymentSlipUrl,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Payment slip file not found" });
    }

    res.download(filePath, `payment-slip-${orderId}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve payment slip" });
  }
};

// GET Verification Status (PUBLIC)
exports.getVerificationStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ order_id: orderId });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const verification = await DegreeVerification.findOne({
      payment: payment._id,
    })
      .select("-__v")
      .populate("payment", "order_id order_status amount trans_date");

    if (!verification) {
      return res.status(404).json({ error: "Verification record not found" });
    }

    res.status(200).json(verification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve verification status" });
  }
};

// GET All Degree Verifications (ADMIN)
exports.getAllDegreeVerifications = async (req, res) => {
  try {
    const verifications = await DegreeVerification.find()
      .populate("payment", "order_id order_status amount trans_date")
      .sort({ createdAt: -1 });

    res.status(200).json(verifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch verifications" });
  }
};

// UPDATE Verification Status (ADMIN)
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const verification = await DegreeVerification.findByIdAndUpdate(
      id,
      {
        status,
        remarks,
        verifiedAt: status === "verified" ? new Date() : undefined,
      },
      { new: true },
    );

    if (!verification) {
      return res.status(404).json({ error: "Verification not found" });
    }

    res.status(200).json({
      success: true,
      message: "Verification status updated successfully",
      verification,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update verification status" });
  }
};
