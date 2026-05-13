const mongoose = require("mongoose");

const serialCounterSchema = new mongoose.Schema({
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
  semester: {
    type: Number,
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

serialCounterSchema.index({ course: 1, semester: 1, stream: 1 }, { unique: true });

module.exports = mongoose.model("SerialCounter", serialCounterSchema);
