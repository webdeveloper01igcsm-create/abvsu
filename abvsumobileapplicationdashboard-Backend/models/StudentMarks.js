const mongoose = require("mongoose");

const subjectMarkSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  marksObtained: { type: Number, required: true },
});

const studentMarksSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admission",
    required: true,
  },
  serialNumber: { type: String, required: true, unique: true },
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
  semester: { type: Number, required: true },
  marks: [subjectMarkSchema],
  examinationDate: { type: Date, required: true },
  dateOfDeclare: { type: Date, required: true },
  dateOfIssue: { type: Date, required: true },
  generated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

studentMarksSchema.index(
  { admission: 1, course: 1, stream: 1, semester: 1 },
  { unique: true, partialFilterExpression: { stream: { $type: "objectId" } } }
);

module.exports = mongoose.model("StudentMarks", studentMarksSchema);
