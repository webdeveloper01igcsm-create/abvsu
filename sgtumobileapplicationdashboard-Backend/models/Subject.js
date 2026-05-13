const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  isElective: {
    type: Boolean,
    default: false,
  },
  maxMarks: {
    type: Number,
    required: true,
  },
  credits: {
    type: Number,
    required: true,
  },
  passingMarks: {
    type: Number,
    required: true,
  }
});

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;