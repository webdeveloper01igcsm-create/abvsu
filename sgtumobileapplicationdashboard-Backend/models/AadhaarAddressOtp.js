const mongoose = require("mongoose");

const aadhaarAddressOtpSchema = new mongoose.Schema({
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admission",
    required: true,
  },
  referenceId: {
    type: String,
    required: true,
  },
  aadhaarNumber: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes
  },
});

aadhaarAddressOtpSchema.index({ admissionId: 1 });
aadhaarAddressOtpSchema.index({ referenceId: 1 });

module.exports = mongoose.model("AadhaarAddressOtp", aadhaarAddressOtpSchema);
