const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  enrollmentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
    default: null,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  admissionDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "Completed", "Dropped"], default: "Active" }
});

admissionSchema.index({ student: 1, session: 1 }, { unique: true });

module.exports = mongoose.model("Admission", admissionSchema);