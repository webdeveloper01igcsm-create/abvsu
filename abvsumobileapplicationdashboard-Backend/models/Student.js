const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, "Name is required"],
    minlength: [1, "Name is required"],
  },
  fatherName: {
    type: String,
    trim: true,
    required: [true, "Father name is required"],
    minlength: [1, "Father name is required"],
  },
  motherName: {
    type: String,
    trim: true,
    default: null,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    default: null,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  aadharNumber: {
    type: Number,
    unique: true,
    trim: true,
    required: [true, "Aadhar Number is required"],
    validate: {
      validator: (v) => v.toString().length === 12,
      message: "Aadhar Number must be a 12-digit number",
    },
  },
  mobileNumber: {
    type: Number,
    trim: true,
    required: [true, "Mobile Number is required"],
    validate: {
      validator: (v) => v.toString().length === 10,
      message: "Mobile Number must be a 10-digit number",
    },
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, "Email is required"],
    match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
  },
  document: {
    aadhar: { type: String, default: null },
    photo: { type: String, default: null },
    pan: { type: String, default: null },
    secondaryMarksheet: { type: String, default: null },
    seniorSecondaryMarksheet: { type: String, default: null },
    graduationMarksheet: { type: String, default: null },
  },
  appRegisDetails: {
    date: { type: Date, default: null },
    status: { type: Boolean, default: false },
  },
  subscriptionDetails: {
    isActive: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
  },
  undertaking: {
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null },
    signatureUrl: { type: String, default: null },
  },
  license: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    lastRenewedAt: { type: Date, default: null },
  },
  aadhaarAddress: {
    houseNo: { type: String, default: null },
    street: { type: String, default: null },
    landmark: { type: String, default: null },
    city: { type: String, default: null },
    district: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    pinCode: { type: String, default: null },
    fetchedAt: { type: Date, default: null },
  },
  pushToken: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Student", studentSchema);
