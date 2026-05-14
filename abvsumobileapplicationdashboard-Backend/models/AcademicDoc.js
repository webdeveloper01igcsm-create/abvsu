const mongoose = require("mongoose");

const AcademicDocSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    fee: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AcademicDoc = mongoose.model('AcademicDoc', AcademicDocSchema);

module.exports = AcademicDoc;
