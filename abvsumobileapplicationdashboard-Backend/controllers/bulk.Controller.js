const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");
const Student = require("../models/Student");
const Admission = require("../models/Admission");

// Define the schema for validating students
const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  enrollmentNumber: z.string().min(1, "Enrollment Number is required"),
  fatherName: z.string().min(1, "Father Name is required"),
  aadharNumber: z
    .number()
    .refine(
      (v) => v.toString().length === 12,
      "Aadhar Number must be a 12-digit number"
    ),

  mobileNumber: z
    .number()
    .refine(
      (v) => v.toString().length === 10,
      "Mobile Number must be a 10-digit number"
    ),

  email: z.string().email("Invalid email address"),

  session: z.string().length(24, "Invalid session ID"),
  course: z.string().length(24, "Invalid course ID"),
  stream: z
    .string()
    .length(24, "Invalid stream ID")
    .optional()
    .or(z.literal("")),
});

// updated
const bulkStudenthandle = async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = path.resolve(file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const studentsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!studentsData || studentsData.length === 0) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ message: "Excel file is empty or invalid" });
    }

    const results = [];
    const errors = [];

    for (const rawStudent of studentsData) {
      try {
        rawStudent.aadharNumber = Number(
          rawStudent.aadharNumber?.toString().replace(/'/g, "").trim()
        );
        rawStudent.mobileNumber = Number(
          rawStudent.mobileNumber?.toString().trim()
        );
        rawStudent.enrollmentNumber = rawStudent.enrollmentNumber
          ?.toString()
          .trim();
        rawStudent.name = rawStudent.name?.trim();
        rawStudent.fatherName = rawStudent.fatherName?.trim();

        const studentData = studentSchema.parse(rawStudent);

        let student = await Student.findOne({
          aadharNumber: studentData.aadharNumber,
        });

        if (!student) {
          student = new Student({
            name: studentData.name,
            fatherName: studentData.fatherName,
            aadharNumber: studentData.aadharNumber,
            mobileNumber: studentData.mobileNumber,
            email: studentData.email,
          });

          await student.save();
        } else {
          if (
            student.name !== studentData.name ||
            student.fatherName !== studentData.fatherName
          ) {
            errors.push({
              student: studentData,
              message:
                "Student data mismatch. Name or Father Name does not match existing records.",
              existing: { name: student.name, fatherName: student.fatherName },
              attempted: {
                name: studentData.name,
                fatherName: studentData.fatherName,
              },
            });
            continue;
          }
          if (
            student.mobileNumber !== studentData.mobileNumber ||
            student.email !== studentData.email
          ) {
            student.mobileNumber = studentData.mobileNumber;
            student.email = studentData.email;
            await student.save();
          }
        }

        const admission = new Admission({
          student: student._id,
          enrollmentNumber: studentData.enrollmentNumber,
          session: studentData.session,
          course: studentData.course,
          stream: studentData.stream || null,
        });

        await admission.save();

        results.push({
          aadharNumber: studentData.aadharNumber,
          message: "Student admission added successfully",
          admission,
          student,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          errors.push({
            student: rawStudent,
            errors: err.errors.map((e) => {
              // friendlier error message
              if (e.path[0] === "fatherName") return "Father Name is required";
              if (e.path[0] === "name") return "Name is required";
              if (e.path[0] === "enrollmentNumber")
                return "Enrollment Number is required";
              if (e.path[0] === "aadharNumber")
                return "Aadhar Number must be a 12-digit number";
              if (e.path[0] === "mobileNumber")
                return "Mobile Number must be a 10-digit number";
              if (e.path[0] === "email") return "Invalid email address";
              if (e.path[0] === "session") return "Invalid Session ID";
              if (e.path[0] === "course") return "Invalid Course ID";
              if (e.path[0] === "stream") return "Invalid Stream ID";
              return `${e.path.join(".")} → ${e.message}`;
            }),
          });
        } else {
          errors.push({
            student: rawStudent,
            errors: [err.message || "Validation/DB error"],
          });
        }
      }
    }

    fs.unlinkSync(filePath);

    if (errors.length > 0 && results.length > 0) {
      return res.status(207).json({
        message: "Partial success. Some students failed.",
        added: results,
        failed: errors,
      });
    }
    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json({
        message: "All students failed validation.",
        failed: errors,
      });
    }
    return res.status(200).json({
      message: "All students uploaded successfully.",
      added: results,
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    return res.status(500).json({
      message: "An error occurred during bulk upload",
      error: error.message,
    });
  }
};

module.exports = { bulkStudenthandle };