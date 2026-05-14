const mongoose = require("mongoose");

const provisionalCounterSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
    default: null
  },
  academicDoc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicDoc",
    required: true
  },
  prefix: {
    type: String,
    required: true
  },
  lastNumber: {
    type: String,
    required: true
  }
});

provisionalCounterSchema.index({ session: 1, course: 1, academicDoc: 1, stream: 1 }, { unique: true });

module.exports = mongoose.model("ProvisionalCounter", provisionalCounterSchema);