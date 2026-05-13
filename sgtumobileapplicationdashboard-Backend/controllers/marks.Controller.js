const mongoose = require("mongoose");
const Student = require('../models/Student');
const Admission = require('../models/Admission');
const StudentMarks = require('../models/StudentMarks');
const {getNextSerialNumber} = require("../utils/getNextSerialNumber");

// updated
exports.getfilteredStudent = async (req, res) => {
  try {
    const { session, course, stream, semester } = req.body;

    // Build match query dynamically
    const matchQuery = {
      session: new mongoose.Types.ObjectId(session),
      course: new mongoose.Types.ObjectId(course),
    };

    if (stream) {
      matchQuery.stream = new mongoose.Types.ObjectId(stream);
    }

    const semesterNumber = parseInt(semester); // ensure it's a number

    const filteredStudentlist = await Admission.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "admission",
          as: "results"
        }
      },
      {
        $match: {
          "results.semesters": {
            $not: {
              $elemMatch: { semesterNumber: semesterNumber }
            }
          }
        }
      },
      {
        $lookup:{
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "studentDetails"
        }
      },
      {
        $unwind: "$studentDetails"
      },
      {
        $project: {
          name: "$studentDetails.name",
          enrollmentNumber: 1,
        }
      }
    ]);

    // const semesterSubject = await Semester.findOne({ _id: semester });
    return res.status(200).json({ success: true, filteredStudentlist });

  } catch (error) {
    console.error("Error fetching filtered students:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

// Get All Student Marks - updated
exports.getAllStudentMarks = async (req, res) => {
  try {
    const all = await StudentMarks.find({ generated: false })
      .populate([
        { path: "admission", populate: { path: "student" } },
        { path: "course" },
        { path: "stream" },
        { path: "marks.subjectId" }
      ]);

    res.json({ success: true, data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add Single Student Marks
exports.addSingleStudentMarks = async (req, res) => {
  try {
    const data = await StudentMarks.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// updated
exports.addMultipleStudentMarks = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0 || students.length > 50) {
      return res.status(400).json({ message: "No student data provided." });
    }

    const results = [];
    const errors = [];

    // Process students sequentially
    for (const student of students) {
      try {
        // Get serial number (processed sequentially to prevent race conditions)
        const serialNumber = await getNextSerialNumber(
          student.course,
          student.semester,
          student.stream || null
        );

        const filter = {
          admission: student._id,
          course: student.course,
          stream: student.stream || null,
          semester: student.semester,
        };

        const update = {
          serialNumber,
          marks: student.marks,
          examinationDate: student.examinationDate,
          dateOfDeclare: student.dateOfDeclare,
          dateOfIssue: student.dateOfIssue,
          updatedAt: new Date()
        };

        const options = { new: true, upsert: true };

        const result = await StudentMarks.findOneAndUpdate(filter, update, options);
        results.push(result);
      } catch (error) {
        console.error(`Error processing student ${student._id}:`, error);
        errors.push({
          studentId: student._id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: "Marks processing completed",
      successCount: results.length,
      errorCount: errors.length,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Error in addMultipleStudentMarks:", error);
    res.status(500).json({ 
      message: "Server error while processing marks",
      error: error.message 
    });
  }
};

// Edit Student Marks by ID
exports.editStudentMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await StudentMarks.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "StudentMarks not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete Student Marks by ID
exports.deleteStudentMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StudentMarks.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "StudentMarks not found" });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get Single Student Marks by ID
exports.getSingleStudentMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const studentMarks = await StudentMarks.findById(id).populate("student course stream marks.subjectId");
    if (!studentMarks) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: studentMarks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};