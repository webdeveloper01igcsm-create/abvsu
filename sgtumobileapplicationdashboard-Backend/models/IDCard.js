const mongoose = require("mongoose");

const idCardSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admission",
    required: true,
    unique: true,
  },
  photo: {
    type: String,
    default: null,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validTill: {
    type: Date,
    required: true,
  },
  cardNumber: {
    type: String,
    unique: true,
    required: true,
  },
  bloodGroup: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    default: null,
  },
  emergencyContact: {
    name: { type: String, default: null },
    phone: { type: String, default: null },
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("IDCard", idCardSchema);
