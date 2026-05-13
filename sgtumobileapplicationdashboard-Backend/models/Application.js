const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },
    dateOfApply: {
      type: Date,
      default: Date.now,
    },
    documentApplied: {
      name: { type: String, required: true },
      fileUrl: { type: String, default: null },
    },
    supportingDocuments: {
      fileUrl: { type: String, default: null },
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "generated", "sent", "rejected"],
      default: "pending",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    generatedFile: {
      type: String,
      default: null,
    },
    serialNumber: {
      type: String,
    },
    cgpa: {
      type: String,
      required: false, 
    },
    sentAt: {
      type: Date,
    },
    dateOfIssue: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

const Application = mongoose.model("application", applicationSchema);

module.exports = Application;