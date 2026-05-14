const mongoose = require("mongoose");

const courseTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  supportsMonthlyDuration: {
    type: Boolean,
    default: false,
  },
});

const CourseType = mongoose.model("CourseType", courseTypeSchema);
module.exports = CourseType;
