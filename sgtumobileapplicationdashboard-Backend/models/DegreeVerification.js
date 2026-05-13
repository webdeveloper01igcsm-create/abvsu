const mongoose = require("mongoose");

const degreeVerificationSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: true,
    trim: true,
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
  },
  mode: {
    type: String,
    enum: ["Normal Mode", "Express Mode"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
  paymentVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "verified", "rejected"],
    default: "pending",
  },
  paymentSlipUrl: {
    type: String,
    default: null,
  },
  verifiedAt: {
    type: Date,
  },
  remarks: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("DegreeVerification", degreeVerificationSchema);
