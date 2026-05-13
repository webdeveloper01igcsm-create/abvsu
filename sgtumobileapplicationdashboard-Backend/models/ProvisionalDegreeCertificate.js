const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    houseNo: { type: String, default: "" },
    street: { type: String, default: "" },
    district: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pinCode: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    alternateNo: { type: String, default: "" },
    landmark: { type: String, default: "" },
  },
  { _id: false },
);

const provisionalDegreeCertificateSchema = new mongoose.Schema(
  {
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },
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
    email: {
      type: String,
      required: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    marksheetFileUrl: {
      type: String,
      default: null,
    },
    lastMigrationFileUrl: {
      type: String,
      default: null,
    },
    acceptedUndertaking: {
      type: Boolean,
      default: false,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    modeOfDelivery: {
      type: String,
      enum: ["Normal", "Express"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    applicationStatus: {
      type: String,
      enum: ["Applied", "Verified", "Rejected"],
      default: "Applied",
    },
    generationStatus: {
      type: Boolean,
      default: false,
    },
    dispatchStatus: {
      type: Boolean,
      default: false,
    },
    dispatchDate: {
      type: Date,
      default: null,
    },
    dispatchReference: {
      type: String,
      default: "",
    },
    generatedFileUrl: {
      type: String,
      default: null,
    },
    officeRemarksApplication: {
      type: String,
      default: "",
    },
    officeRemarksPayment: {
      type: String,
      default: "",
    },
    officeRemarksGeneration: {
      type: String,
      default: "",
    },
    officeRemarksDispatch: {
      type: String,
      default: "",
    },
    paymentSlipUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ProvisionalDegreeCertificate",
  provisionalDegreeCertificateSchema,
);
