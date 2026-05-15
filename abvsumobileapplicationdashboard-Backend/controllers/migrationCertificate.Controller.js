const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
  verifyRazorpaySignature,
} = require("../utils/razorpayGateway");
const Admission = require("../models/Admission");
const Payment = require("../models/Payment");
const MigrationCertificate = require("../models/MigrationCertificate");
const MigrationCertificateOtp = require("../models/MigrationCertificateOtp");
const {
  jsonError,
  resolveUploadsFilePath,
  sanitizePdfFilename,
  streamInlinePdf,
} = require("../utils/apiResponse");

const OTP_TTL_MINUTES = 10;
const MAX_MARKSHEET_BYTES = 200 * 1024;

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
};

const buildPaymentForm = buildRazorpayAutoSubmitHtml;

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const resolveApiBaseUrl = (req) => {
  const forwardedProto = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(req.get("host") || "").trim();
  const protocol = forwardedProto || req.protocol || "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  const configuredBase = normalizeBaseUrl(process.env.BASE_URL);
  if (configuredBase) {
    return configuredBase;
  }

  return "https://api.sikkimglobaltechnicaluniversity.co.in";
};

const resolveDeliveryMode = (payload) => {
  const normalSelected =
    String(payload.normalMode) === "true" ||
    payload.modeOfDelivery === "Normal";
  const expressSelected =
    String(payload.expressMode) === "true" ||
    payload.modeOfDelivery === "Express";

  if (normalSelected === expressSelected) {
    return null;
  }

  return expressSelected ? "Express" : "Normal";
};

const normalizeFile = (file) => (file ? `/uploads/${file.filename}` : null);

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(500).json({ message: "Email service not configured" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await MigrationCertificateOtp.findOneAndUpdate(
      { admission: req.user.id, email },
      { otpHash, verified: false, createdAt: new Date() },
      { upsert: true, new: true },
    );

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subject = "SGTU Migration Certificate OTP";
    const text = `Your OTP for Migration Certificate is ${otp}. It is valid for ${OTP_TTL_MINUTES} minutes.`;

    await transporter.sendMail({ from, to: email, subject, text });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedOtp = String(otp || "").trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit number" });
    }

    const otpRecord = await MigrationCertificateOtp.findOne({
      admission: req.user.id,
      email,
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    const isValid = await bcrypt.compare(normalizedOtp, otpRecord.otpHash);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    return res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

const applyForMigrationCertificate = async (req, res) => {
  try {
    const {
      email,
      acceptUndertaking,
      houseNo,
      street,
      district,
      state,
      country,
      pinCode,
      mobileNo,
      alternateNo,
      landmark,
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingActiveApplication = await MigrationCertificate.findOne({
      admission: req.user.id,
      applicationStatus: { $ne: "Rejected" },
    });

    if (existingActiveApplication) {
      return res.status(409).json({
        message:
          "You have already applied for migration certificate. New application is allowed only if previous one is rejected.",
      });
    }

    const marksheetFile = req.files?.marksheetFile?.[0] || null;
    if (!marksheetFile) {
      return res.status(400).json({ message: "Marksheet PDF is required" });
    }

    if (marksheetFile.size > MAX_MARKSHEET_BYTES) {
      return res
        .status(400)
        .json({ message: "Marksheet PDF must be less than 200KB" });
    }

    const undertakingAccepted = String(acceptUndertaking) === "true";
    if (!undertakingAccepted) {
      return res
        .status(400)
        .json({ message: "Please accept and acknowledge before proceeding" });
    }

    if (
      !houseNo ||
      !street ||
      !district ||
      !state ||
      !country ||
      !pinCode ||
      !mobileNo ||
      !alternateNo ||
      !landmark
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all required address fields" });
    }

    if (!/^\d{6}$/.test(String(pinCode || "").trim())) {
      return res
        .status(400)
        .json({ message: "Pin Code must be exactly 6 digits" });
    }

    if (!/^\d{10}$/.test(String(mobileNo || "").trim())) {
      return res
        .status(400)
        .json({ message: "Mobile number must be exactly 10 digits" });
    }

    if (!/^\d{10}$/.test(String(alternateNo || "").trim())) {
      return res
        .status(400)
        .json({ message: "Alternate mobile number must be exactly 10 digits" });
    }

    const modeOfDelivery = resolveDeliveryMode(req.body);
    if (!modeOfDelivery) {
      return res
        .status(400)
        .json({ message: "Please select exactly one delivery mode" });
    }

    const amount = modeOfDelivery === "Express" ? 7500 : 5000;

    const admission = await Admission.findById(req.user.id).populate([
      { path: "student", select: "name" },
    ]);

    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const order_id = `MC${Date.now()}${uuidv4().substring(0, 6)}`;
    const currency = "INR";
    const apiBase = resolveApiBaseUrl(req);
    const studentBase =
      process.env.STUDENT_PORTAL_URL || "https://student.sgtu.ac.in";
    const isMobileReturn =
      String(req.get("x-client") || "").toLowerCase() === "mobile";
    const returnQuery = isMobileReturn ? "?return=mobile" : "";
    const redirect_url = `${apiBase}/migration-certificate/razorpay-response${returnQuery}`;
    const cancel_url = isMobileReturn
      ? `${apiBase}/migration-certificate/razorpay-response${returnQuery}`
      : `${studentBase}/authenticate/migration-certificate/status?cancelled=true`;
    if (!keyId || !keySecret) {
      return res
        .status(500)
        .json({ message: "Payment gateway configuration error" });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "migration-certificate", local_order_id: order_id },
    });

    const payment = await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Migration Certificate",
      payment_purpose: "Payment for Migration Certificate",
      status_message: "Payment initiated for Migration Certificate",
    });

    await MigrationCertificate.create({
      admission: admission._id,
      enrollmentNumber: admission.enrollmentNumber,
      studentName: admission.student.name,
      email,
      emailVerified: true,
      marksheetFileUrl: normalizeFile(marksheetFile),
      acceptedUndertaking: true,
      address: {
        houseNo: houseNo || "",
        street: street || "",
        district: district || "",
        state: state || "",
        country: country || "",
        pinCode: pinCode || "",
        mobileNo: mobileNo || "",
        alternateNo: alternateNo || "",
        landmark: landmark || "",
      },
      modeOfDelivery,
      amount,
      payment: payment._id,
      paymentStatus: "Pending",
    });

    const formHTML = buildPaymentForm({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: process.env.PAYMENT_BRAND_NAME || "ABVSU",
      description: "Migration Certificate",
      customerName: admission.student.name,
      customerEmail: email,
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.error("Error applying for migration certificate:", error);
    return res.status(500).json({ message: "Failed to apply" });
  }
};

const generatePaymentSlip = (record, payment) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `migration-certificate-payment-slip-${record._id}.pdf`;
      const uploadDir = path.join(process.cwd(), "document", "slips");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("MIGRATION CERTIFICATE PAYMENT SLIP", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).font("Helvetica").text("Payment Confirmation", {
        align: "center",
      });
      doc.moveDown(2);

      doc.fontSize(12).font("Helvetica-Bold").text("Transaction Details:");
      doc.fontSize(12).font("Helvetica");
      doc.text(`Receipt No: ${payment.order_id}`);
      doc.text(`Transaction ID: ${payment.tracking_id || "N/A"}`);
      doc.text(`Bank Reference: ${payment.bank_ref_no || "N/A"}`);
      doc.text(`Payment Mode: ${payment.payment_mode || "N/A"}`);
      doc.text(`Status: ${payment.order_status}`);
      const paymentDate = payment.trans_date
        ? new Date(payment.trans_date).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");
      doc.text(`Date: ${paymentDate}`);
      doc.moveDown();

      doc.font("Helvetica-Bold").text("Student Details:");
      doc.font("Helvetica");
      doc.text(`Name: ${record.studentName}`);
      doc.text(`Enrollment Number: ${record.enrollmentNumber}`);
      doc.text(`Email: ${record.email}`);
      doc.moveDown();

      doc.font("Helvetica-Bold").text("Application Details:");
      doc.font("Helvetica");
      doc.text("Type: Migration Certificate");
      doc.text(`Delivery Mode: ${record.modeOfDelivery}`);
      doc.text(`Amount Paid: ₹${record.amount}`);
      doc.moveDown(2);

      doc.fontSize(10).font("Helvetica-Oblique");
      doc.text("This is a computer-generated payment slip.", {
        align: "center",
      });
      doc.text("Please retain this slip for your records.", {
        align: "center",
      });

      doc.end();

      stream.on("finish", () => {
        resolve(`slips/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const handleRazorpayResponse = async (req, res) => {
  try {
    const body = req.body || {};
    const failedOrderId =
      body?.error?.metadata?.order_id ||
      body?.error?.metadata?.razorpay_order_id ||
      "";
    const orderId = body.razorpay_order_id || failedOrderId;
    const paymentId = body.razorpay_payment_id || "";
    const signature = body.razorpay_signature || "";
    const failureMessageFromBody = String(
      body?.error?.description || body?.error?.reason || "",
    ).trim();
    const isSignatureValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });
    const verifiedOrderStatus =
      isSignatureValid && orderId && paymentId ? "Success" : "Failed";

    if (!orderId) {
      return res.status(400).send("Invalid payment response");
    }

    const params = {
      order_id: orderId,
      tracking_id: paymentId,
      order_status: verifiedOrderStatus,
      failure_message: failureMessageFromBody,
      payment_mode: "",
      card_name: "",
      status_code: isSignatureValid ? "200" : "400",
      status_message: isSignatureValid ? "Payment captured" : "Payment failed",
      currency: "INR",
      amount: undefined,
    };

    const payment = await Payment.findOne({ order_id: orderId });
    if (!payment) {
      return res.status(404).send("Payment record not found");
    }

    const orderStatusRaw = Array.isArray(params.order_status)
      ? params.order_status[0]
      : params.order_status;
    const orderStatus = String(orderStatusRaw || "").trim();
    const normalizedOrderStatus = orderStatus.toLowerCase();

    const failureMessageRaw = Array.isArray(params.failure_message)
      ? params.failure_message[0]
      : params.failure_message;
    const failureMessage = String(failureMessageRaw || "").trim();

    payment.tracking_id = params.tracking_id || payment.tracking_id;
    payment.bank_ref_no = params.bank_ref_no || "";
    payment.order_status = orderStatus || payment.order_status;
    payment.failure_message = failureMessage;
    payment.payment_mode = params.payment_mode || "";
    payment.card_name = params.card_name || "";
    payment.status_code = params.status_code || "";
    payment.status_message = params.status_message || "";
    payment.currency = params.currency || payment.currency;
    payment.amount = parseFloat(params.amount || payment.amount || 0);
    payment.trans_date = new Date();

    await payment.save();

    const record = await MigrationCertificate.findOne({ payment: payment._id });

    const isSuccess = normalizedOrderStatus === "success";
    const isCancelled =
      normalizedOrderStatus === "aborted" ||
      normalizedOrderStatus === "cancelled" ||
      normalizedOrderStatus === "canceled";

    if (record) {
      record.paymentStatus = isSuccess ? "Paid" : "Failed";

      if (isSuccess) {
        try {
          const slipUrl = await generatePaymentSlip(record, payment);
          record.paymentSlipUrl = slipUrl;
        } catch (error) {
          console.error("Error generating payment slip:", error);
        }
      } else {
        record.paymentSlipUrl = null;
      }

      await record.save();
    }

    const isMobileReturn = req.query.return === "mobile";
    const studentBase =
      process.env.STUDENT_PORTAL_URL || "https://student.sgtu.ac.in";
    const appScheme = process.env.MOBILE_APP_SCHEME || "myapp";
    const appBase = `${appScheme}://services/migration-certificate/status`;
    let redirectUrl;

    if (isSuccess) {
      redirectUrl = isMobileReturn
        ? `${appBase}?payment=success&orderId=${encodeURIComponent(
            params.order_id || "",
          )}`
        : `${studentBase}/authenticate/migration-certificate/status?payment=success&orderId=${encodeURIComponent(
            params.order_id || "",
          )}`;
    } else if (isCancelled) {
      redirectUrl = isMobileReturn
        ? `${appBase}?cancelled=true`
        : `${studentBase}/authenticate/migration-certificate/status?cancelled=true`;
    } else {
      const failureReason = encodeURIComponent(
        failureMessage || "Payment failed",
      );
      redirectUrl = isMobileReturn
        ? `${appBase}?payment=failed&orderId=${encodeURIComponent(
            params.order_id || "",
          )}&reason=${failureReason}`
        : `${studentBase}/authenticate/migration-certificate/status?payment=failed&orderId=${encodeURIComponent(
            params.order_id || "",
          )}&reason=${failureReason}`;
    }

    if (!isSuccess) {
      return res.status(200).send(`
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Payment Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #1f2937;">
            <h2 style="font-size: 24px; margin-bottom: 16px;">Payment ${orderStatus}</h2>
            <p style="margin-bottom: 20px;">Redirecting to status page...</p>
            <p><a href="${redirectUrl}" style="color: #2563eb; text-decoration: none;">Click here if not redirected</a></p>
            <script>
              setTimeout(function () {
                window.location.href = "${redirectUrl}";
              }, 1200);
            </script>
          </body>
        </html>
      `);
    }
    return res.redirect(303, redirectUrl);
  } catch (error) {
    console.error("Error handling payment response:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const retryPayment = async (req, res) => {
  try {
    const record = await MigrationCertificate.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (String(record.admission) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (record.paymentStatus === "Paid") {
      return res.status(400).json({ message: "Payment already completed" });
    }

    const admission = await Admission.findById(record.admission).populate([
      { path: "student", select: "name" },
    ]);

    if (!admission || !admission.student) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const apiBase = resolveApiBaseUrl(req);
    const studentBase =
      process.env.STUDENT_PORTAL_URL || "https://student.sgtu.ac.in";

    if (!keyId || !keySecret) {
      return res
        .status(500)
        .json({ message: "Payment gateway configuration error" });
    }

    const amount = record.amount;
    const currency = "INR";
    const order_id = `MC${Date.now()}${uuidv4().substring(0, 6)}`;
    const isMobileReturn =
      String(req.get("x-client") || "").toLowerCase() === "mobile";
    const returnQuery = isMobileReturn ? "?return=mobile" : "";
    const redirect_url = `${apiBase}/migration-certificate/razorpay-response${returnQuery}`;
    const cancel_url = isMobileReturn
      ? `${apiBase}/migration-certificate/razorpay-response${returnQuery}`
      : `${studentBase}/authenticate/migration-certificate/status?cancelled=true`;
    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "migration-certificate", local_order_id: order_id },
    });

    const payment = await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Migration Certificate",
      payment_purpose: "Payment for Migration Certificate",
      status_message: "Payment initiated for Migration Certificate",
    });

    record.payment = payment._id;
    record.paymentStatus = "Pending";
    record.paymentSlipUrl = null;
    await record.save();

    const formHTML = buildPaymentForm({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: process.env.PAYMENT_BRAND_NAME || "ABVSU",
      description: "Migration Certificate",
      customerName: admission.student.name,
      customerEmail: record.email,
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.error("Error retrying payment:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
};

const getMyRecords = async (req, res) => {
  try {
    const records = await MigrationCertificate.find({
      admission: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    return res.status(500).json({ message: "Failed to fetch records" });
  }
};

const getAllRecords = async (req, res) => {
  try {
    const records = await MigrationCertificate.find({})
      .populate({
        path: "admission",
        select: "enrollmentNumber student course stream session",
        populate: [
          { path: "student", select: "name" },
          { path: "course", select: "name" },
          { path: "stream", select: "name" },
          { path: "session", select: "session" },
        ],
      })
      //adding the order_id from payment collection to the response of get all records api
      .populate("payment", "order_id")
      .sort({ createdAt: -1 });

    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    return res.status(500).json({ message: "Failed to fetch records" });
  }
};

const updateRecord = async (req, res) => {
  try {
    const updates = {
      applicationStatus: req.body.applicationStatus,
      paymentStatus: req.body.paymentStatus,
      generationStatus: req.body.generationStatus,
      dispatchStatus: req.body.dispatchStatus,
      dispatchDate: req.body.dispatchDate || null,
      dispatchReference: req.body.dispatchReference || "",
      officeRemarksApplication: req.body.officeRemarksApplication || "",
      officeRemarksPayment: req.body.officeRemarksPayment || "",
      officeRemarksGeneration: req.body.officeRemarksGeneration || "",
      officeRemarksDispatch: req.body.officeRemarksDispatch || "",
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    const record = await MigrationCertificate.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true },
    );

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res.status(200).json({ message: "Record updated", record });
  } catch (error) {
    console.error("Error updating record:", error);
    return res.status(500).json({ message: "Failed to update record" });
  }
};

const uploadGeneratedFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const record = await MigrationCertificate.findByIdAndUpdate(
      req.params.id,
      {
        generatedFileUrl: `/uploads/${req.file.filename}`,
        generationStatus: true,
      },
      { new: true },
    );

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res.status(200).json({ message: "File uploaded", record });
  } catch (error) {
    console.error("Error uploading generated file:", error);
    return res.status(500).json({ message: "Failed to upload file" });
  }
};

const downloadGeneratedFile = async (req, res) => {
  try {
    const record = await MigrationCertificate.findById(req.params.id);
    if (!record) {
      return jsonError(res, 404, "Record not found");
    }

    if (String(record.admission) !== String(req.user.id)) {
      return jsonError(res, 403, "Not authorized");
    }

    if (!record.generatedFileUrl) {
      return jsonError(res, 404, "Generated file not available");
    }

    const filePath = resolveUploadsFilePath(record.generatedFileUrl);
    if (!filePath) {
      return jsonError(res, 404, "Generated file not available");
    }

    const inlineName = sanitizePdfFilename(
      `migration-certificate-${record.enrollmentNumber || record._id}`,
    );
    const streamed = streamInlinePdf(res, filePath, inlineName);
    if (!streamed) {
      return jsonError(res, 404, "Generated file not found");
    }

    return;
  } catch (error) {
    console.error("Error downloading file:", error);
    return jsonError(res, 500, "Failed to download");
  }
};

const getPaymentSlip = async (req, res) => {
  try {
    const record = await MigrationCertificate.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (String(record.admission) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!record.paymentSlipUrl && record.payment) {
      try {
        const payment = await Payment.findById(record.payment);
        if (payment && payment.order_status === "Success") {
          const slipUrl = await generatePaymentSlip(record, payment);
          record.paymentSlipUrl = slipUrl;
          await record.save();
        }
      } catch (error) {
        console.error("Error regenerating payment slip:", error);
      }
    }

    if (!record.paymentSlipUrl) {
      return res.status(404).json({ message: "Payment slip not available" });
    }

    const relativePath = record.paymentSlipUrl.startsWith("/")
      ? record.paymentSlipUrl.slice(1)
      : record.paymentSlipUrl;
    const filePath = path.join(process.cwd(), "document", relativePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Payment slip file not found" });
    }

    const downloadName = `migration-certificate-payment-slip-${record.enrollmentNumber}.pdf`;
    return res.download(filePath, downloadName);
  } catch (error) {
    console.error("Error retrieving payment slip:", error);
    return res.status(500).json({ message: "Failed to download payment slip" });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  applyForMigrationCertificate,
  handleRazorpayResponse,
  getMyRecords,
  getAllRecords,
  updateRecord,
  uploadGeneratedFile,
  downloadGeneratedFile,
  retryPayment,
  getPaymentSlip,
};

