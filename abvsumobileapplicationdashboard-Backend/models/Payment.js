const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  order_id: {
    type: String,
    required: true,
    unique: true
  },
  tracking_id: {
    type: String,
  },
  bank_ref_no: String,
  order_status: {
    type: String,
    enum: ["Pending", "Success", "Failed", "Cancelled", "Aborted"],
    default: "Pending"
  },
  payment_source: {
    type: String,
    default: "General",
  },
  payment_purpose: {
    type: String,
    default: "",
  },
  payment_gateway: {
    type: String,
    default: "Razorpay",
  },
  failure_message: String,
  payment_mode: String,
  card_name: String,
  status_code: String,
  status_message: String,
  currency: {
    type: String,
    required: true
  },
  amount: Number,
  trans_date: Date
}, { timestamps: true });

paymentSchema.pre("save", function setPaymentDefaults(next) {
  if (!this.status_message) {
    if (this.order_status === "Pending") {
      this.status_message = "Payment initiated and awaiting confirmation";
    } else if (this.order_status === "Success") {
      this.status_message = "Payment captured successfully";
    } else if (this.order_status === "Cancelled" || this.order_status === "Aborted") {
      this.status_message = "Payment was cancelled by user";
    } else if (this.order_status === "Failed") {
      this.status_message = this.failure_message || "Payment failed";
    }
  }

  if (!this.payment_purpose) {
    this.payment_purpose = this.payment_source
      ? `Payment for ${this.payment_source}`
      : "Payment for requested service";
  }

  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
