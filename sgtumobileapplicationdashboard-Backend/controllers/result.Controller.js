const fs = require("fs");
const path = require("path");
const Result = require("../models/Result");
const { z } = require("zod");
const StudentMarks = require("../models/StudentMarks");
const Student = require("../models/Student");
const { generateResultPDF } = require("../utils/resultPdf");
const { downResult } = require("../utils/downResult");

const addStudentResult = async (req, res) => {
  try {
    const { studentId, semesterNumber, status } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required.",
      });
    }

    const existingResult = await Result.findOne({
      student: studentId,
      "semesters.semesterNumber": semesterNumber,
    });

    if (existingResult) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Result already published for this semester.",
      });
    }

    const resultFolder = path.join(__dirname, "../result");
    if (!fs.existsSync(resultFolder)) {
      fs.mkdirSync(resultFolder);
    }

    const newFilePath = path.join(
      resultFolder,
      `${studentId}_semester${semesterNumber}.pdf`,
    );
    const tempFilePath = req.file.path;
    fs.renameSync(tempFilePath, newFilePath);
    const result = await Result.findOneAndUpdate(
      { student: studentId },
      {
        $push: {
          semesters: {
            semesterNumber,
            resultPdf: newFilePath,
            status,
            visible: false, // Default visibility set to false
          },
        },
      },
      { new: true, upsert: true },
    );

    res.status(201).json({
      success: true,
      message: "Result added successfully.",
    });
  } catch (error) {
    fs.unlinkSync(newFilePath);
    console.error("Error adding result:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add result. Please try again later.",
    });
  }
};

// update
const getResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { semesterNumber } = req.query;
    if (!semesterNumber) {
      const result = await Result.findOne({ admission: id });
      // console.log(result);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Result not Published.",
        });
      }

      const tosendresult = [];
      result.semesters.forEach((sem) => {
        tosendresult.push({
          semesterNumber: sem.semesterNumber,
          status: sem.status,
          visible: sem.visible,
        });
      });
      return res.status(200).json({
        success: true,
        result: tosendresult,
      });
    }
    const result = await Result.findOne({
      admission: id,
      "semesters.semesterNumber": semesterNumber,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not Published.",
      });
    }
    const semester = result.semesters.find(
      (sem) => sem.semesterNumber === parseInt(semesterNumber),
    );

    if (!semester || !semester.resultPdf) {
      return res.status(404).json({
        success: false,
        message: "Semester result not found.",
      });
    }

    const filePath = semester.resultPdf;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Result file not found on server.",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Result_Semester_${semesterNumber}.pdf`,
    );
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve result. Please try again later.",
    });
  }
};

const getStudentResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { semesterNumber } = req.query;
    if (req.user.id !== id) {
      return res.status(403).json({
        message: "Access denied. Not authorized to view this result.",
      });
    }
    if (!semesterNumber) {
      const result = await Result.findOne({ admission: id });
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Result not Published.",
        });
      }
      const tosendresult = result.semesters
        .filter((sem) => sem.visible === true)
        .map((sem) => ({
          semesterNumber: sem.semesterNumber,
          status: sem.status,
        }));
      return res.status(200).json({
        success: true,
        result: tosendresult,
      });
    }
    const result = await Result.findOne({
      admission: id,
      "semesters.semesterNumber": semesterNumber,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not Published.",
      });
    }
    const semester = result.semesters.find(
      (sem) =>
        sem.semesterNumber === parseInt(semesterNumber) && sem.visible === true,
    );

    if (!semester || !semester.resultPdf || !semester.visible) {
      return res.status(404).json({
        success: false,
        message: "Semester result not found.",
      });
    }

    const filePath = semester.resultPdf;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Result file not found on server.",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Result_Semester_${semesterNumber}.pdf`,
    );
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve result. Please try again later.",
    });
  }
};

// updated
const generateResults = async (req, res) => {
  const { studentIds } = req.body;
  if (
    !Array.isArray(studentIds) ||
    studentIds.length === 0 ||
    studentIds.length > 20
  ) {
    return res.status(400).json({ error: "studentIds array is required" });
  }

  const report = [];

  try {
    // Ensure result folder exists
    const resultFolder = path.join(__dirname, "../result");
    if (!fs.existsSync(resultFolder)) {
      fs.mkdirSync(resultFolder, { recursive: true });
    }

    for (const studentId of studentIds) {
      try {
        const marksEntry = await StudentMarks.findById(studentId).populate([
          { path: "admission", populate: { path: "student" } },
          { path: "course" },
          { path: "stream" },
          { path: "marks.subjectId" },
        ]);

        if (!marksEntry) {
          report.push({ studentId, success: false, message: "No marks found" });
          continue;
        }

        const admission = marksEntry.admission || {};
        const student = admission.student;

        if (!student) {
          report.push({
            studentId,
            success: false,
            message: "Student not found in admission",
          });
          continue;
        }

        // Check if already published
        const already = await Result.findOne({
          admission: marksEntry.admission._id,
          "semesters.semesterNumber": marksEntry.semester,
        });

        if (already) {
          // Clean up the generated temp PDF
          report.push({
            studentId,
            success: false,
            message: "Result already published for this semester",
          });
          continue;
        }

        // Generate PDF (returns a temp filepath)
        const tempPdfPath = await generateResultPDF(marksEntry);

        // Move PDF into result folder
        const newFileName = `${marksEntry._id}_sem${marksEntry.semester}.pdf`;
        const newPdfPath = path.join(resultFolder, newFileName);
        fs.renameSync(tempPdfPath, newPdfPath);

        // Save into Result collection
        await Result.findOneAndUpdate(
          { admission: marksEntry.admission._id },
          {
            $push: {
              semesters: {
                semesterNumber: marksEntry.semester,
                resultPdf: newPdfPath,
                status: "Pass",
              },
            },
          },
          { upsert: true, new: true },
        );

        await StudentMarks.findByIdAndUpdate(
          studentId,
          { $set: { generated: true } },
          { new: true },
        );

        report.push({ studentId, success: true });
      } catch (innerErr) {
        console.error(`Error processing ${studentId}:`, innerErr);
        report.push({ studentId, success: false, message: innerErr.message });
      }
    }

    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error("Unexpected error in generateResults:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// updated
const downloadMarksheet = async (req, res) => {
  try {
    const { studentId, semesterNumber } = req.params;

    // Find the student marks entry for the given semester
    // const marksEntry = await StudentMarks.findOne({
    //   admission: studentId,
    //   semester: semesterNumber,
    // }).populate("student course stream marks.subjectId");

    const marksEntry = await StudentMarks.findOne({
      admission: studentId,
      semester: semesterNumber,
    }).populate([
      { path: "admission", populate: { path: "student" } },
      { path: "course" },
      { path: "stream" },
      { path: "marks.subjectId" },
    ]);

    if (!marksEntry) {
      return res
        .status(404)
        .json({ message: "Result not found for this semester." });
    }

    // Generate the PDF
    const pdfPath = await downResult(marksEntry);

    // Send the PDF file as download
    res.download(
      pdfPath,
      `${marksEntry.admission.student.name}_sem${semesterNumber}_result.pdf`,
      (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).send("Error sending file.");
        }
        fs.unlink(pdfPath, (err) => {
          if (err) console.error("Failed to delete PDF:", err);
        });
      },
    );
  } catch (error) {
    console.error("Error generating marksheet PDF:", error);
    res.status(500).json({ message: "Failed to generate marksheet PDF." });
  }
};

// updated
const studentVerify = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-fA-F0-9]{24}$/.test(String(id || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification id",
      });
    }

    const result = await StudentMarks.findById(id).populate([
      { path: "admission", populate: { path: "student" } },
      { path: "course" },
      { path: "stream" },
    ]);

    if (!result || !result.admission || !result.admission.student) {
      return res.status(404).json({
        success: false,
        message: "Verification record not found",
      });
    }

    const studentData = {
      studentName: result.admission?.student?.name,
      fatherName: result.admission?.student?.fatherName,
      enrollmentNumber: result.admission?.enrollmentNumber,
      course: result.course?.name,
      stream: result.stream?.name || null,
      semester: result.semester,
      serialNumber: result.serialNumber,
    };

    res.status(200).json({ status: "sucess", data: studentData });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve result. Please try again later.",
    });
  }
};

// updated
const resultVisiblity = async (req, res) => {
  try {
    const { studentId, semesterNumber, visible } = req.body;
    if (!studentId || semesterNumber === undefined || visible === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required feild: studentId, semsterNumber, visible",
      });
    }
    const result = await Result.findOne({ admission: studentId });
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }
    const semester = result.semesters.find(
      (sem) => sem.semesterNumber === parseInt(semesterNumber),
    );
    if (!semester) {
      return res.status(400).json({
        success: false,
        message: "Semster not found",
      });
    }
    semester.visible = visible;
    await result.save();
    return res.status(200).json({
      success: false,
      message: `Visible set to ${visible}`,
    });
  } catch (error) {
    console.log("Error toggle visiblity", error);
    return res.status(500).json({
      success: false,
      message: "Server Error while changing the visiblity",
    });
  }
};

// updated
const deleteResult = async (req, res) => {
  try {
    const { studentId, semesterNumber } = req.params;
    const resultUpdate = await Result.findOneAndUpdate(
      { admission: studentId },
      {
        $pull: {
          semesters: { semesterNumber: parseInt(semesterNumber) },
        },
      },
      { new: true },
    );
    const updateMarks = await StudentMarks.findOneAndUpdate(
      { admission: studentId, semester: parseInt(semesterNumber) },
      { $set: { generated: false } },
    );

    if (!resultUpdate && !updateMarks) {
      return res.status(400).json({
        success: false,
        message: "No result found for deletion",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Result deleted",
    });
  } catch (error) {
    console.log("Error while deleting Result", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error occured",
    });
  }
};

module.exports = {
  addStudentResult,
  getStudentResult,
  generateResults,
  getResult,
  downloadMarksheet,
  studentVerify,
  deleteResult,
  resultVisiblity,
};
