const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const Verification = require("../models/Verification.js");
const jwt = require("jsonwebtoken");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage }).single("file");

const UploadVideo = async (req, res) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({
      message: "Access denied. No token provided or invalid token format.",
    });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res
      .status(403)
      .json({ message: "Access denied. No token provided." });
  }

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    try {
      const decoded = jwt.verify(token, process.env.STUDENT_SECRET);
      const aadharNumber = decoded.aadharNumber;
      const mobile = decoded.mobile;

      const uploadDir = path.join(__dirname, "../../uploads/videos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${aadharNumber}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      fs.renameSync(req.file.path, filePath);

      const videoUrl = `${process.env.BASE_URL}/uploads/videos/${fileName}`;
      await Verification.findOneAndUpdate(
        { mobile },
        {
          $set: {
            videoUrl,
            verificationStatus: "pending",
          },
        }
      );

     
      return res
        .status(200)
        .json({ message: "Student Verification is done successfully" });
    } catch (error) {
      console.error("Error uploading video:", error);
      return res
        .status(500)
        .json({ message: "Error uploading video", error: error.message });
    }
  });
};

const addStudent = async (req, res) => {
  try {
    const { name, mobile, course, aadharNumber, verificationStatus } = req.body;
    const createdBy = req.user.userId;

    if (!name || !mobile || !course || !aadharNumber) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (aadharNumber.length !== 12 || !/^\d+$/.test(aadharNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid Aadhar number. Must be 12 digits." });
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return res
        .status(400)
        .json({ message: "Invalid Mobile number. Must be 10 digits." });
    }

    const existingStudent = await Verification.findOne({
      $or: [{ aadharNumber }, { mobile }],
    });

    if (existingStudent) {
      return res.status(400).json({
        message:
          "A student with the same Aadhar or Mobile number already exists.",
      });
    }

    const newStudent = new Verification({
      name,
      mobile,
      course,
      aadharNumber,
      createdBy,
      verifiedBy: null,
      logs: [
        {
          action: "created",
          user: createdBy,
          timestamp: new Date(),
        },
      ],
    });

    const savedStudent = await newStudent.save();

    // console.log("Student added successfully:", savedStudent);

    return res.status(201).json({
      message: "Student added successfully",
      student: savedStudent,
    });
  } catch (error) {
    console.error("Error adding student:", error);

    return res.status(500).json({
      message: "Failed to add student",
      error: error.message,
    });
  }
};

const editStudent = async (req, res) => {
  try {
    const { mobile } = req.params;
    const { name, course, videoUrl, verificationStatus } = req.body;
    const verifiedBy = req.user.userId;

    const student = await Verification.findOne({ mobile: mobile.trim() });
    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found with this mobile number" });
    }

    if (student.verificationStatus === "verified" && user.role !== "superadmin") {
      return res
        .status(400)
        .json({ message: "Student is already verified and cannot be updated." });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (course) updateFields.course = course;
    if (videoUrl) updateFields.videoUrl = videoUrl;
    if (verificationStatus) updateFields.verificationStatus = verificationStatus;

    let actionType = null;
    if (verificationStatus === "verified") {
      actionType = "verified";
      updateFields.verifiedBy = verifiedBy;
    } else if (verificationStatus === "rejected") {
      actionType = "rejected";
      updateFields.videoUrl = "pending"
      updateFields.verifiedBy = verifiedBy;
    }

    const updatedStudent = await Verification.findOneAndUpdate(
      { mobile: mobile.trim() },
      {
        $set: updateFields,
        ...(actionType && {
          $push: {
            logs: {
              action: actionType,
              user: verifiedBy,
              timestamp: new Date(),
            },
          },
        }),
      },
      { new: true }
    );

    return res
      .status(200)
      .json({
        message: `Student ${actionType || "updated"} successfully`,
        updatedStudent,
      });
  } catch (error) {
    console.error("Error editing student:", error);
    return res
      .status(500)
      .json({ message: "Failed to update student", error: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { mobile } = req.params;
    const deletedStudent = await Verification.findOneAndDelete({ mobile });
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting Student:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete Student", error: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {

    const userType = req.user.role
    let students;

    if (userType == "admin" || userType == "superadmin") {
      students = await Verification.find()
        .populate("createdBy", "name")
        .populate("verifiedBy", "name").populate("logs.user", "name");
    } else {
      students = await Verification.find({ createdBy: req.user.userId });
    }

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }

    return res.status(200).json({
      message: "Students retrieved successfully",
      students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);

    return res.status(500).json({
      message: "Failed to retrieve students",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { aadharNumber, mobile } = req.body;
    if (!aadharNumber || !mobile) {
      return res
        .status(400)
        .json({ message: "Aadhar number and mobile number are required" });
    }
    const student = await Verification.findOne({ aadharNumber, mobile });
    if (!student) {
      return res.status(404).json({
        message: "Student not found or invalid Aadhar number/mobile number",
      });
    }
    if (student.videoUrl !== "pending") {
      return res
        .status(200)
        .json({ message: "Verification already completed" });
    }
    const token = jwt.sign(
      {
        studentId: student._id,
        aadharNumber: student.aadharNumber,
        mobile: student.mobile,
      },
      process.env.STUDENT_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      message: "Login successful",
      success: true,
      token,
      student: {
        name: student.name,
        aadharNumber: student.aadharNumber,
        mobile: student.mobile,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const verify = (req, res) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({
      message: "Access denied. No token provided or invalid token format.",
    });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res
      .status(403)
      .json({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, process.env.STUDENT_SECRET);

    req.user = decoded;

    return res.status(200).json({
      message: "You have access to this protected route.",
      verified: true,
      user: decoded,
    });
  } catch (error) {
    console.error("Invalid token:", error);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired. Please log in again." });
    } else if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid token. Please log in again." });
    } else {
      return res
        .status(401)
        .json({ message: "Unauthorized access. Please log in again." });
    }
  }
};

const UploadVideoByAdmin = async (req, res) => {

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    try {
      const { aadharNumber } = req.body;
      if (!aadharNumber) {
        return res.status(400).json({ message: "Aadhar number is required" });
      }

      const student = await Verification.findOne({ aadharNumber });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const uploadDir = path.join(__dirname, "../../uploads/videos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${aadharNumber}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      fs.renameSync(req.file.path, filePath);

      const videoUrl = `${process.env.BASE_URL}/uploads/videos/${fileName}`;
      await Verification.findOneAndUpdate(
        { aadharNumber },
        {
          $set: {
            videoUrl,
            verificationStatus: "pending",
          },
        }
      );

      return res.status(200).json({ message: "Video uploaded by admin successfully" });
    } catch (error) {
      console.error("Error uploading video by admin:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
};

module.exports = {
  verify,
  login,
  getAllStudents,
  deleteStudent,
  editStudent,
  addStudent,
  UploadVideo,
  UploadVideoByAdmin,
};