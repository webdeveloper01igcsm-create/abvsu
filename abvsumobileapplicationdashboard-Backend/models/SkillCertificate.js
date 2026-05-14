const mongoose = require('mongoose');

const skillCertificateSchema = new mongoose.Schema(
  {
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      required: true,
    },
    certificateType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillCertificateType',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'generated'],
      default: 'pending',
    },
    serialNumber: {
      type: String,
      default: null,
    },
    issueDate: {
      type: Date,
      default: null,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

skillCertificateSchema.index({ admission: 1, certificateType: 1 }, { unique: true });

module.exports = mongoose.model('SkillCertificate', skillCertificateSchema);