const mongoose = require("mongoose");

const transcriptCertificateOtpSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admission",
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

transcriptCertificateOtpSchema.index({ admission: 1, email: 1 });

module.exports = mongoose.model(
  "TranscriptCertificateOtp",
  transcriptCertificateOtpSchema,
);
