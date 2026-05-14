const crypto = require("crypto");
const {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
  verifyRazorpaySignature,
} = require("../utils/razorpayGateway");
const Payment = require("../models/Payment");
const Student = require("../models/Student");
const Application = require("../models/Application");

const PAYMENT_FORM_TTL_MS = 5 * 60 * 1000;
const paymentFormStore = new Map();

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPaymentFormHtml = buildRazorpayAutoSubmitHtml;

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const storePaymentForm = async (req, res) => {
  try {
    const html = String(req.body?.html || "").trim();
    if (!html) {
      return res.status(400).json({ message: "Invalid payment form payload" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + PAYMENT_FORM_TTL_MS;
    paymentFormStore.set(token, { html, expiresAt });

    setTimeout(() => {
      const entry = paymentFormStore.get(token);
      if (entry && entry.expiresAt <= Date.now()) {
        paymentFormStore.delete(token);
      }
    }, PAYMENT_FORM_TTL_MS + 1000);

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error storing payment form:", error);
    return res.status(500).json({ message: "Failed to store payment form" });
  }
};

const renderPaymentForm = async (req, res) => {
  try {
    const token = req.params.token;
    const entry = paymentFormStore.get(token);

    if (!entry || entry.expiresAt <= Date.now()) {
      return res.status(404).send("Payment form expired");
    }

    paymentFormStore.delete(token);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(entry.html);
  } catch (error) {
    console.error("Error rendering payment form:", error);
    return res.status(500).send("Failed to render payment form");
  }
};

const createOrder = async (req, res) => {
  try {
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const order_id = Date.now();
    const currency = "INR";
    const amount = 504.0;
    const apiBase =
      normalizeBaseUrl(process.env.BACKEND_URL) ||
      normalizeBaseUrl(process.env.BASE_URL) ||
      "https://api.sikkimglobaltechnicaluniversity.co.in";
    const redirect_url = `${apiBase}/payment/verify-payment`;
    const cancel_url = `${apiBase}/payment/verify-payment?cancelled=true`;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
    const { userId, name, email } = req.body;

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: String(order_id),
      notes: { service: "subscription", local_order_id: String(order_id) },
    });

    await Payment.create({
      student_id: userId,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Subscription",
      payment_purpose: "Payment for Subscription",
      status_message: "Payment initiated for Subscription",
    });
    const formHTML = buildPaymentFormHtml({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: "SGTU",
      description: "Subscription",
      customerName: name || "",
      customerEmail: email || "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.log("Error creating order:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const referer = req.get("referer") || "";
    const origin = req.get("origin") || "";

    if (!referer.includes("sgtu.ac.in") && !origin.includes("sgtu.ac.in")) {
      console.warn(
        `Unauthorized payment verification attempt from: ${origin || referer}`,
      );
      return res.status(403).send("<h1>Forbidden</h1>");
    }

    const body = req.body || {};
    const order_id =
      body.razorpay_order_id ||
      body?.error?.metadata?.order_id ||
      body?.error?.metadata?.razorpay_order_id;
    const tracking_id = body.razorpay_payment_id || "";
    const razorpay_signature = body.razorpay_signature || "";
    const order_status = verifyRazorpaySignature({
      orderId: order_id,
      paymentId: tracking_id,
      signature: razorpay_signature,
    })
      ? "Success"
      : "Failed";
    const failure_message = String(
      body?.error?.description || body?.error?.reason || "",
    );
    const trans_date = new Date().toISOString();

    let payment = await Payment.findOne({ order_id });

    if (!payment) {
      console.error(`Payment record not found for order_id: ${order_id}`);
      return res.status(404).send("<h1>Payment record not found</h1>");
    }

    payment.tracking_id = tracking_id || payment.tracking_id;
    payment.bank_ref_no = "";
    payment.order_status = order_status;
    payment.failure_message = failure_message;
    payment.payment_mode = "";
    payment.card_name = "";
    payment.status_code = order_status === "Success" ? "200" : "400";
    payment.status_message =
      order_status === "Success" ? "Payment captured" : "Payment failed";
    payment.trans_date = new Date(trans_date);

    await payment.save();

    if (order_status === "Success" && payment.student_id) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1); // 1-year plan

      await Student.findByIdAndUpdate(payment.student_id, {
        $set: {
          "subscriptionDetails.isActive": true, // boolean
          "subscriptionDetails.expiryDate": endDate,
        },
      });

      console.log(`Subscription updated for student: ${payment.student_id}`);
    }

    const safeOrderStatus = escapeHtml(order_status || "Unknown");
    const safeOrderId = escapeHtml(order_id || "-");
    const safeAmount = escapeHtml(payment.amount || "-");
    const safeTrackingId = escapeHtml(tracking_id || "-");
    const safeBankRef = "-";
    const safePaymentMode = "-";
    const safeStatusMessage = escapeHtml(payment.status_message || "-");
    const safeTransDate = escapeHtml(trans_date || "-");

    const html = `
      <html>
        <head>
          <title>Payment ${safeOrderStatus}</title>
          <style>
            body { font-family: Arial; text-align: center; margin-top: 40px; }
            table { margin: auto; border-collapse: collapse; }
            td, th { border: 1px solid #ccc; padding: 8px; }
            .success { color: green; }
            .failed { color: red; }
          </style>
        </head>
        <body>
          <h1 class="${order_status === "Success" ? "success" : "failed"}">
            Payment ${safeOrderStatus}
          </h1>
          <table>
            <tr><th>Order ID</th><td>${safeOrderId}</td></tr>
            <tr><th>Amount</th><td>${safeAmount}</td></tr>
            <tr><th>Tracking ID</th><td>${safeTrackingId}</td></tr>
            <tr><th>Bank Ref No</th><td>${safeBankRef}</td></tr>
            <tr><th>Payment Mode</th><td>${safePaymentMode}</td></tr>
            <tr><th>Status Message</th><td>${safeStatusMessage}</td></tr>
            <tr><th>Transaction Date</th><td>${safeTransDate}</td></tr>
          </table>
        </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).send("<h1>Internal Server Error</h1>");
  }
};

const verifyDocs = async (req, res) => {
  try {
    const {
      order_id,
      tracking_id,
      bank_ref_no,
      order_status,
      failure_message,
      payment_mode,
      card_name,
      status_code,
      status_message,
      currency,
      amount,
      trans_date,
    } = req.body;

    let payment = await Payment.findOne({ order_id });

    if (!payment) {
      console.error(`Payment record not found for order_id: ${order_id}`);
      return res.status(404).send("<h1>Payment record not found</h1>");
    }

    const normalizedOrderStatus = String(order_status || "")
      .trim()
      .toLowerCase();
    const isSuccess = normalizedOrderStatus === "success";

    payment.tracking_id = tracking_id || payment.tracking_id;
    payment.bank_ref_no = bank_ref_no;
    payment.order_status = order_status || payment.order_status;
    payment.failure_message = failure_message;
    payment.payment_mode = payment_mode;
    payment.card_name = card_name;
    payment.status_code = status_code;
    payment.status_message = status_message;
    payment.currency = currency;
    const parsedAmount = Number(amount);
    payment.amount =
      Number.isFinite(parsedAmount) && parsedAmount >= 0
        ? parsedAmount
        : payment.amount;
    payment.trans_date = new Date();

    await payment.save();

    const application = await Application.findOne({ payment: payment._id });
    if (!application) {
      console.warn(
        `[verifyDocs] Application not found for payment_id=${payment._id} order_id=${order_id}`,
      );
    } else if (isSuccess) {
      application.amountPaid = payment.amount;
      application.paymentVerified = true;
      application.status = "paid";
      await application.save();
    } else {
      if (application.status === "paid") {
        application.status = "pending";
      }
      if (!isSuccess) {
        application.paymentVerified = false;
      }
      await application.save();
    }

    const safeOrderStatus = escapeHtml(order_status || "Unknown");
    const safeOrderId = escapeHtml(order_id || "-");
    const safeAmount = escapeHtml(amount || "-");
    const safeTrackingId = escapeHtml(tracking_id || "-");
    const safeBankRef = escapeHtml(bank_ref_no || "-");
    const safePaymentMode = escapeHtml(payment_mode || "-");
    const safeStatusMessage = escapeHtml(status_message || "-");
    const safeTransDate = escapeHtml(trans_date || "-");

    const html = `
      <html>
        <head>
          <title>Payment ${safeOrderStatus}</title>
          <style>
            body { font-family: Arial; text-align: center; margin-top: 40px; }
            table { margin: auto; border-collapse: collapse; }
            td, th { border: 1px solid #ccc; padding: 8px; }
            .success { color: green; }
            .failed { color: red; }
          </style>
        </head>
        <body>
          <h1 class="${isSuccess ? "success" : "failed"}">
            Payment ${safeOrderStatus}
          </h1>
          <table>
            <tr><th>Order ID</th><td>${safeOrderId}</td></tr>
            <tr><th>Amount</th><td>${safeAmount}</td></tr>
            <tr><th>Tracking ID</th><td>${safeTrackingId}</td></tr>
            <tr><th>Bank Ref No</th><td>${safeBankRef}</td></tr>
            <tr><th>Payment Mode</th><td>${safePaymentMode}</td></tr>
            <tr><th>Status Message</th><td>${safeStatusMessage}</td></tr>
            <tr><th>Transaction Date</th><td>${safeTransDate}</td></tr>
          </table>
        </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).send("<h1>Internal Server Error</h1>");
  }
};

const getAllPayment = async (req, res) => {
  try {
    const payments = await Payment.aggregate([
      {
        $addFields: {
          sortDate: { $ifNull: ["$trans_date", "$createdAt"] },
        },
      },
      { $sort: { sortDate: -1 } },
    ]);

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createOrder,
  storePaymentForm,
  renderPaymentForm,
  verifyPayment,
  verifyDocs,
  getAllPayment,
};
