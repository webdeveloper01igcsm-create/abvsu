const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admission",
    required: true,
    unique: true,
  },
  semesters: [
    {
      semesterNumber: {
        type: Number,
        min: 1,
        required: true,
      },
      resultPdf: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["Pass", "Fail"],
        required: true,
      },
      visible: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

resultSchema.index(
  { admission: 1, "semesters.semesterNumber": 1 },
  { unique: true },
);

module.exports = mongoose.model("Result", resultSchema);
