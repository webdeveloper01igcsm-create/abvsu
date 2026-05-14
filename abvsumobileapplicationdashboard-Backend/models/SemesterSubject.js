const mongoose = require("mongoose");

const semesterSubjectSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
    required: false,
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
  },
  subjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
  ],
});

const SemesterSubject = mongoose.model(
  "SemesterSubject",
  semesterSubjectSchema,
);
module.exports = SemesterSubject;
