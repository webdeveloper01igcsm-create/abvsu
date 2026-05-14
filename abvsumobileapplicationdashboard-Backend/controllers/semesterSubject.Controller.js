const SemesterSubject = require("../models/SemesterSubject");
const Subject = require("../models/Subject");

// Create or Update SemesterSubject
exports.addOrUpdateSemesterSubjects = async (req, res) => {
  try {
    const { courseId, streamId, semester, subjects } = req.body;

    // Check if record already exists
    const existing = await SemesterSubject.findOne({
      courseId,
      streamId,
      semester,
    });

    if (existing) {
      // Update the subjects
      existing.subjects = subjects;
      await existing.save();
      return res.status(200).json({ message: "Subjects updated", data: existing });
    }

    // Create new entry
    const newEntry = await SemesterSubject.create({
      courseId,
      streamId,
      semester,
      subjects,
    });

    res.status(201).json({ message: "Subjects added", data: newEntry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all semester subjects (with populate)
exports.getAllSemesterSubjects = async (req, res) => {
  try {
    const data = await SemesterSubject.find()
      .populate("courseId", "name")
      .populate("streamId", "name")
      .populate("subjects", "name code");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get subjects by Course + Stream + Semester
exports.getSubjectsByDetails = async (req, res) => {
  try {
    const { courseId, streamId, semester } = req.query;
    const condition = { courseId, semester };
    if (streamId) condition.streamId = streamId;

    const result = await SemesterSubject.findOne(condition)
      .populate("subjects", "name code maxMarks passingMarks");

    if (!result) return res.status(404).json({ message: "No subjects found." });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a semester-subject mapping
exports.deleteSemesterSubject = async (req, res) => {
  try {
    const { id } = req.params;
    await SemesterSubject.findByIdAndDelete(id);
    res.status(200).json({ message: "Mapping deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};