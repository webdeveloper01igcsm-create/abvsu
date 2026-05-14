const mongoose = require('mongoose');

const skillCertificateSerialSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    stream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stream',
      default: null,
    },
    certificateType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillCertificateType',
      required: true,
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
    },
    lastNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

skillCertificateSerialSchema.index(
  { session: 1, course: 1, stream: 1, certificateType: 1 },
  { unique: true }
);

module.exports = mongoose.model('SkillCertificateSerial', skillCertificateSerialSchema);