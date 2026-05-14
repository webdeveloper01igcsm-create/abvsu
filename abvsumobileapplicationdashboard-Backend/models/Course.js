const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  courseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseType",
    required: true,
  },
  hasStream: {
    type: Boolean,
    default: false,
  },
  duration: {
    format: {
      type: String,
      enum: ["Year", "Semester", "Month"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
    },
    inYears: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  streams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
    },
  ],
});

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
