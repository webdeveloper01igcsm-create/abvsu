const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, 
  },
  mobile: {
    type: String,
    required: true,
    unique: true, 
    trim: true,
    minlength: 10,
    maxlength: 10,
  },
  aadharNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 12,
    maxlength: 12,
  },
  course: {
    type: String,
    required: true,
    trim: true,
  },
  videoUrl: {
    type: String,
    default: "pending", 
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending", 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, 
  },
  logs: [
    {
      action: {
        type: String,
        enum: ["created", "verified", "rejected"],
        required: true,
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now, 
  },
});

const Verification = mongoose.model("Verification", verificationSchema);

module.exports = Verification;
