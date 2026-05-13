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
const AcademicRecordVerification = require("../models/AcademicRecordVerification");
const AcademicRecordOtp = require("../models/AcademicRecordOtp");
const {
  jsonError,
  resolveUploadsFilePath,
  sanitizePdfFilename,
  streamInlinePdf,
} = require("../utils/apiResponse");

const OTP_TTL_MINUTES = 10;

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

// ─── Verification Pricing Matrix ───────────────────────────────────────────
// Per selected document type, keyed by deliveryType and speed.
const VERIFICATION_RATES = {
  "E-copy": { Normal: 1000, Express: 2500 },
  Physical: { Normal: 1500, Express: 4000 },
};

/**
 * Derives delivery type from applyFor field.
 * "Verification of Documents via Email" → "E-copy"
 * "Verification of Documents by Post"  → "Physical"
 */
const resolveDeliveryType = (applyFor) => {
  return applyFor === "Verification of Documents by Post"
    ? "Physical"
    : "E-copy";
};

/**
 * Calculates total amount for academic record verification.
 * @param {string} deliveryType - "E-copy" | "Physical"
 * @param {boolean} expressSelected
 * @param {number} docCount - number of selected document types
 * @returns {number}
 */
const calculateVerificationAmount = (
  deliveryType,
  expressSelected,
  docCount,
) => {
  const speed = expressSelected ? "Express" : "Normal";
  const ratePerDoc = VERIFICATION_RATES[deliveryType]?.[speed] ?? 1000;
  return docCount * ratePerDoc;
};
// ─────────────────────────────────────────────────────────────────────────────

const getDocCount = (payload, files) => {
  let count = 0;
  const marksheetCount = Number(payload.marksheetCount || 0);
  if (marksheetCount > 0 && files.marksheetFile) {
    count += marksheetCount;
  }
  if (files.provisionalFile) count += 1;
  if (files.degreeFile) count += 1;
  if (files.transcriptFile) count += 1;
  return count;
};

const getSelectedDocumentCount = (payload) => {
  let count = 0;
  // Count selected document types from form data (mobile app sends as strings)
  if (String(payload.selectedTypes?.marksheet || payload.marksheet) === "true")
    count += 1;
  if (
    String(
      payload.selectedTypes?.provisionalCertificate ||
        payload.provisionalCertificate,
    ) === "true"
  )
    count += 1;
  if (
    String(
      payload.selectedTypes?.degreeCertificate || payload.degreeCertificate,
    ) === "true"
  )
    count += 1;
  if (
    String(
      payload.selectedTypes?.transcriptCertificate ||
        payload.transcriptCertificate,
    ) === "true"
  )
    count += 1;
  return count;
};

const normalizeFiles = (files) => {
  const mapFile = (file) => (file ? `/uploads/${file.filename}` : null);
  return {
    marksheetFile: mapFile(files.marksheetFile?.[0]),
    provisionalFile: mapFile(files.provisionalFile?.[0]),
    degreeFile: mapFile(files.degreeFile?.[0]),
    transcriptFile: mapFile(files.transcriptFile?.[0]),
    mergedDocumentsFile: mapFile(files.mergedDocumentsFile?.[0]),
  };
};

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

    await AcademicRecordOtp.findOneAndUpdate(
      { admission: req.user.id, email },
      { otpHash, verified: false, createdAt: new Date() },
      { upsert: true, new: true },
    );

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subject = "Verification OTP";
    const text = `Your OTP for Academic Records Verification is ${otp}. It is valid for ${OTP_TTL_MINUTES} minutes.`;

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

    const otpRecord = await AcademicRecordOtp.findOne({
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

const applyForVerification = async (req, res) => {
  try {
    const {
      applyFor,
      email,
      marksheetCount,
      houseNo,
      street,
      district,
      state,
      country,
      pinCode,
      mobileNo,
      alternateNo,
      landmark,
      expressMode,
    } = req.body;

    if (!applyFor || !email) {
      return res
        .status(400)
        .json({ message: "Apply for and email are required" });
    }

    const requiresAddress = applyFor === "Verification of Documents by Post";

    if (requiresAddress) {
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
        return res.status(400).json({
          message: "Alternate mobile number must be exactly 10 digits",
        });
      }
    }

    const otpRecord = await AcademicRecordOtp.findOne({
      admission: req.user.id,
      email,
      verified: true,
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Email not verified" });
    }

    const admission = await Admission.findById(req.user.id).populate([
      { path: "student", select: "name" },
    ]);

    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    const files = normalizeFiles(req.files || {});

    // Detect merged file mode (new mobile flow) vs legacy mode (web/old mobile)
    const isMergedMode = !!req.files.mergedDocumentsFile?.[0];

    // Calculate express delivery mode (used in both flows)
    const expressSelected = String(expressMode) === "true";

    let amount = 0;
    let selectedDocCount = 0;

    const deliveryType = resolveDeliveryType(applyFor);

    if (isMergedMode) {
      // New mobile flow: calculate based on selected document types
      selectedDocCount = getSelectedDocumentCount(req.body);

      if (selectedDocCount === 0) {
        return res.status(400).json({
          message: "Please select at least one document type",
        });
      }
      amount = calculateVerificationAmount(
        deliveryType,
        expressSelected,
        selectedDocCount,
      );
    } else {
      // Legacy flow: calculate based on uploaded files
      const documentCount = getDocCount(req.body, req.files || {});

      if (documentCount === 0) {
        return res
          .status(400)
          .json({ message: "Please upload at least one document" });
      }
      amount = calculateVerificationAmount(
        deliveryType,
        expressSelected,
        documentCount,
      );
    }

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const order_id = `AR${Date.now()}${uuidv4().substring(0, 6)}`;
    const currency = "INR";
    const apiBase = resolveApiBaseUrl(req);
    const studentBase =
      process.env.STUDENT_PORTAL_URL || "https://student.sgtu.ac.in";
    const isMobileReturn =
      String(req.get("x-client") || "").toLowerCase() === "mobile";
    const returnQuery = isMobileReturn ? "?return=mobile" : "";
    const redirect_url = `${apiBase}/academic-records/razorpay-response${returnQuery}`;
    const cancel_url = isMobileReturn
      ? `${apiBase}/academic-records/razorpay-response${returnQuery}`
      : `${studentBase}/authenticate/academic-records/status?cancelled=true`;

    if (!keyId || !keySecret) {
      return res
        .status(500)
        .json({ message: "Payment gateway configuration error" });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "academic-records", local_order_id: order_id },
    });

    const payment = await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Academic Record Verification",
      payment_purpose: "Payment for Academic Record Verification",
      status_message: "Payment initiated for Academic Record Verification",
    });

    // Build documents object based on mode
    const documentsObject = isMergedMode
      ? {
          mergedFileUrl: files.mergedDocumentsFile,
          selectedTypes: {
            marksheet:
              String(
                req.body.selectedTypes?.marksheet || req.body.marksheet,
              ) === "true",
            provisionalCertificate:
              String(
                req.body.selectedTypes?.provisionalCertificate ||
                  req.body.provisionalCertificate,
              ) === "true",
            degreeCertificate:
              String(
                req.body.selectedTypes?.degreeCertificate ||
                  req.body.degreeCertificate,
              ) === "true",
            transcriptCertificate:
              String(
                req.body.selectedTypes?.transcriptCertificate ||
                  req.body.transcriptCertificate,
              ) === "true",
          },
          // Keep legacy fields null for merged mode
          marksheet: { count: 0, fileUrl: null },
          provisionalCertificate: null,
          degreeCertificate: null,
          transcriptCertificate: null,
        }
      : {
          mergedFileUrl: null,
          selectedTypes: {
            marksheet: false,
            provisionalCertificate: false,
            degreeCertificate: false,
            transcriptCertificate: false,
          },
          // Use legacy fields for web/legacy mode
          marksheet: {
            count: Number(marksheetCount || 0),
            fileUrl: files.marksheetFile,
          },
          provisionalCertificate: files.provisionalFile,
          degreeCertificate: files.degreeFile,
          transcriptCertificate: files.transcriptFile,
        };

    const record = await AcademicRecordVerification.create({
      admission: admission._id,
      enrollmentNumber: admission.enrollmentNumber,
      studentName: admission.student.name,
      applyFor,
      email,
      emailVerified: true,
      documents: documentsObject,
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
      modeOfDelivery: {
        standard: !expressSelected,
        express: expressSelected,
      },
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
      name: "SGTU",
      description: "Academic Record Verification",
      customerName: admission.student.name,
      customerEmail: record.email || email || "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.error("Error applying for verification:", error);
    return res.status(500).json({ message: "Failed to apply" });
  }
};

const handleRazorpayResponse = async (req, res) => {
  try {
    const body = req.body || {};
    const failedOrderId = body?.error?.metadata?.order_id || body?.error?.metadata?.razorpay_order_id || "";
    const orderId = body.razorpay_order_id || failedOrderId;
    const paymentId = body.razorpay_payment_id || "";
    const signature = body.razorpay_signature || "";
    const failureMessageFromBody = String(body?.error?.description || body?.error?.reason || "").trim();
    const isSignatureValid = verifyRazorpaySignature({ orderId, paymentId, signature });
    const verifiedOrderStatus = isSignatureValid && orderId && paymentId ? "Success" : "Failed";
    if (!orderId) { return res.status(400).send("Invalid payment response"); }
    const params = { order_id: orderId, tracking_id: paymentId, order_status: verifiedOrderStatus, failure_message: failureMessageFromBody, payment_mode: "", card_name: "", status_code: isSignatureValid ? "200" : "400", status_message: isSignatureValid ? "Payment captured" : "Payment failed", currency: "INR", amount: undefined };

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

    const record = await AcademicRecordVerification.findOne({
      payment: payment._id,
    });

    const isSuccess = normalizedOrderStatus === "success";
    const isCancelled =
      normalizedOrderStatus === "aborted" ||
      normalizedOrderStatus === "cancelled" ||
      normalizedOrderStatus === "canceled";
    const callbackOrderId = Array.isArray(params.order_id)
      ? params.order_id[0]
      : params.order_id;

    console.log("[academic-records][razorpay] callback", {
      orderId: callbackOrderId || "",
      paymentId: String(payment._id),
      normalizedOrderStatus,
      recordFound: Boolean(record),
      isMobileReturn: req.query.return === "mobile",
    });

    if (!record) {
      console.warn("[academic-records][razorpay] linked record not found", {
        orderId: callbackOrderId || "",
        paymentId: String(payment._id),
      });
    }

    if (record) {
      record.paymentStatus = isSuccess ? "Paid" : "Failed";

      if (isSuccess) {
        try {
          const slipUrl = await generatePaymentSlip(record, payment);
          record.paymentSlipUrl = slipUrl;
        } catch (err) {
          console.error("Error generating payment slip:", err);
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
    const appBase = `${appScheme}://services/academic-records/status`;
    let redirectUrl;

    if (isSuccess) {
      redirectUrl = isMobileReturn
        ? `${appBase}?payment=success&orderId=${encodeURIComponent(
            params.order_id || "",
          )}`
        : `${studentBase}/authenticate/academic-records/status?payment=success&orderId=${encodeURIComponent(
            params.order_id || "",
          )}`;
    } else if (isCancelled) {
      redirectUrl = isMobileReturn
        ? `${appBase}?cancelled=true`
        : `${studentBase}/authenticate/academic-records/status?cancelled=true`;
    } else {
      const failureReason = encodeURIComponent(
        failureMessage || "Payment failed",
      );
      redirectUrl = isMobileReturn
        ? `${appBase}?payment=failed&orderId=${encodeURIComponent(
            params.order_id || "",
          )}&reason=${failureReason}`
        : `${studentBase}/authenticate/academic-records/status?payment=failed&orderId=${encodeURIComponent(
            params.order_id || "",
          )}&reason=${failureReason}`;
    }

    if (!isSuccess) {
      const statusHeading = isCancelled
        ? "Payment Cancelled"
        : "Payment Failed";
      const statusMessage = isCancelled
        ? "You have cancelled the payment."
        : "We were unable to process your payment.";

      return res.status(200).send(`
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${statusHeading}</title>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #1f2937;">
            <h2 style="font-size: 24px; margin-bottom: 16px;">${statusHeading}</h2>
            <p style="margin-bottom: 12px; font-size: 16px;">${statusMessage}</p>
            <p style="margin-bottom: 24px; font-size: 14px;">Redirecting to your application status page.</p>
            <p style="font-size: 14px;">
              If you are not redirected automatically, <a href="${redirectUrl}" style="color: #2563eb; text-decoration: none;">click here</a>.
            </p>
            <script>
              setTimeout(function () {
                window.location.href = "${redirectUrl}";
              }, 1200);
            </script>
          </body>
        </html>
      `);
    }

    const paidAmount = payment.amount || params.amount || "";
    const paymentDate = payment.trans_date
      ? new Date(payment.trans_date).toLocaleString("en-IN")
      : new Date().toLocaleString("en-IN");

    return res.status(200).send(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #1f2937;">
          <h2 style="font-size: 24px; margin-bottom: 16px;">Payment Successful</h2>
          <p style="margin-bottom: 8px;">Order ID: ${params.order_id || ""}</p>
          <p style="margin-bottom: 8px;">Amount Paid: ₹${paidAmount}</p>
          <p style="margin-bottom: 8px;">Tracking ID: ${payment.tracking_id || "N/A"}</p>
          <p style="margin-bottom: 8px;">Bank Reference: ${payment.bank_ref_no || "N/A"}</p>
          <p style="margin-bottom: 16px;">Date: ${paymentDate}</p>
          <p style="margin-bottom: 20px;">Your payment has been confirmed.</p>
          <p>
            <a href="${redirectUrl}" style="background: #1d4ed8; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">Open Status Page</a>
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error handling payment response:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const retryPayment = async (req, res) => {
  try {
    const record = await AcademicRecordVerification.findById(req.params.id);
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
    const order_id = `AR${Date.now()}${uuidv4().substring(0, 6)}`;
    const isMobileReturn =
      String(req.get("x-client") || "").toLowerCase() === "mobile";
    const returnQuery = isMobileReturn ? "?return=mobile" : "";
    const redirect_url = `${apiBase}/academic-records/razorpay-response${returnQuery}`;
    const cancel_url = isMobileReturn
      ? `${apiBase}/academic-records/razorpay-response${returnQuery}`
      : `${studentBase}/authenticate/academic-records/status?cancelled=true`;

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "academic-records", local_order_id: order_id },
    });

    const payment = await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Academic Record Verification",
      payment_purpose: "Payment for Academic Record Verification",
      status_message: "Payment initiated for Academic Record Verification",
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
      name: "SGTU",
      description: "Academic Record Verification",
      customerName: admission.student.name,
      customerEmail: record.email || email || "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.error("Error retrying payment:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
};

const generatePaymentSlip = (record, payment) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `academic-record-payment-slip-${record._id}.pdf`;
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
        .text("ACADEMIC RECORD PAYMENT SLIP", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("Payment Confirmation", { align: "center" });
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
      doc.text(`Applied For: ${record.applyFor}`);
      const slipDeliveryType = resolveDeliveryType(record.applyFor);
      const slipSpeed = record.modeOfDelivery?.express ? "Express" : "Normal";
      doc.text(`Delivery Type: ${slipDeliveryType}`);
      doc.text(`Speed: ${slipSpeed}`);

      // Selected document types (merged / mobile flow)
      const slipSelectedTypes = record.documents?.selectedTypes || {};
      const slipSelectedDocs = [];
      if (slipSelectedTypes.marksheet) slipSelectedDocs.push("Marksheet");
      if (slipSelectedTypes.provisionalCertificate)
        slipSelectedDocs.push("Provisional Certificate");
      if (slipSelectedTypes.degreeCertificate)
        slipSelectedDocs.push("Degree Certificate");
      if (slipSelectedTypes.transcriptCertificate)
        slipSelectedDocs.push("Transcript Certificate");

      // Legacy flow docs
      const marksheetCount = record.documents?.marksheet?.count || 0;
      if (marksheetCount && !slipSelectedDocs.length) {
        doc.text(`Marksheet Copies: ${marksheetCount}`);
      }
      const legacyDocs = [];
      if (record.documents?.provisionalCertificate)
        legacyDocs.push("Provisional Certificate");
      if (record.documents?.degreeCertificate)
        legacyDocs.push("Degree Certificate");
      if (record.documents?.transcriptCertificate)
        legacyDocs.push("Transcript Certificate");

      const allDocs = slipSelectedDocs.length ? slipSelectedDocs : legacyDocs;
      const slipDocCount =
        slipSelectedDocs.length || marksheetCount + legacyDocs.length;

      if (allDocs.length) {
        doc.text(`Documents: ${allDocs.join(", ")}`);
      }

      const slipRatePerDoc = VERIFICATION_RATES[slipDeliveryType]?.[slipSpeed];
      if (slipRatePerDoc && slipDocCount > 0) {
        doc.text(`Rate per Document: ₹${slipRatePerDoc}`);
        doc.text(`Number of Documents: ${slipDocCount}`);
      }
      doc.text(`Amount Paid: ₹${record.amount}`);
      doc.moveDown(2);

      doc.fontSize(10).font("Helvetica-Oblique");
      doc.text("This is a computer-generated payment slip.", {
        align: "center",
      });
      doc.text("Please retain this slip for your records.", {
        align: "center",
      });
      doc.moveDown();
      doc.text("For queries, contact: verification@sgtu.ac.in", {
        align: "center",
      });

      doc.end();

      stream.on("finish", () => {
        resolve(`slips/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getMyRecords = async (req, res) => {
  try {
    const records = await AcademicRecordVerification.find({
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
    const records = await AcademicRecordVerification.find({})
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

    const record = await AcademicRecordVerification.findByIdAndUpdate(
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

    const record = await AcademicRecordVerification.findByIdAndUpdate(
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
    const record = await AcademicRecordVerification.findById(req.params.id);
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
      `academic-record-${record.enrollmentNumber || record._id}`,
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
    const record = await AcademicRecordVerification.findById(req.params.id);
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

    const downloadName = `academic-record-payment-slip-${record.enrollmentNumber}.pdf`;
    return res.download(filePath, downloadName);
  } catch (error) {
    console.error("Error retrieving payment slip:", error);
    return res.status(500).json({ message: "Failed to download payment slip" });
  }
};

module.exports = {
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
};
