const Student = require("../models/Student");
const Admission = require("../models/Admission");
const path = require("path");
const fs = require("fs");
const { z } = require("zod");

const documentUploadSchema = z.object({
  studentId: z.string().nonempty(),
  docName: z
    .enum(["aadhar", "pan", "secondaryMarksheet", "seniorSecondaryMarksheet", "graduationMarksheet"]),
});

const photoUploadSchema = z.object({
  studentId: z.string().nonempty(),
});

const documentupload = async (req, res) => {
  try {
    const { studentId, docName } = req.body;
    documentUploadSchema.parse({ studentId, docName });
    if (!req.file) {
      return res.status(400).json({ message: "File is required." });
    }

    const admission = await Admission.findById(studentId)
    const student = await Student.findById(admission.student);
    // const student = await Student.findById(studentId);
    if (!student) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Student not found." });
    }

    const documentFolder = path.join(__dirname, "../document");
    if (!fs.existsSync(documentFolder)) {
      fs.mkdirSync(documentFolder);
    }

    const fileExtension = path.extname(req.file.originalname);

    const allowedExtensions = [".pdf"];
    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Only PDF and image files are allowed." });
    }
    const newFilePath = path.join(
      documentFolder,
      `${studentId}_${docName}${fileExtension}`
    );

    fs.renameSync(req.file.path, newFilePath);

    await Student.findByIdAndUpdate(
      admission.student,
      { $set: { [`document.${docName}`]: newFilePath } },
      { new: true }
    );
    res.status(200).json({ message: "Document uploaded successfully" });
  } catch (error) {
    console.log(error);
    if (error.errors) {
      return res.status(400).json({ message: error.errors[0].message });
    }
  }
}

const documentview = async (req, res) => {
  try {
    const { studentId, docName } = req.query;

    documentUploadSchema.parse({ studentId, docName });

    const admission = await Admission.findById(studentId)
    const student = await Student.findById(admission.student);

    // const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const documentPath = student.document[docName];
    if (!documentPath) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!fs.existsSync(documentPath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.contentType("application/pdf");
    const fileStream = fs.createReadStream(documentPath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      console.error("Error while streaming the file:", error);
      res.status(500).json({ message: "Error streaming the document" });
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const photoUpload = async (req, res) => {
  try {
    const { studentId } = req.body;
    photoUploadSchema.parse({ studentId });

    if (!req.file) {
      return res.status(400).json({ message: "File is required." });
    }
    const admission = await Admission.findById(studentId)
    const student = await Student.findById(admission.student);
    if (!student) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Student not found." });
    }

    const documentFolder = path.join(__dirname, "../document");
    if (!fs.existsSync(documentFolder)) {
      fs.mkdirSync(documentFolder);
    }

    const fileExtension = path.extname(req.file.originalname);

    const allowedExtensions = [".jpg", ".jpeg", ".png"];
    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Only image files are allowed." });
    }
    const newFilePath = path.join(
      documentFolder,
      `${studentId}_photo${fileExtension}`
    );

    fs.renameSync(req.file.path, newFilePath);

    await Student.findByIdAndUpdate(
      admission.student,
      { $set: { [`document.photo`]: newFilePath } },
      { new: true }
    );
    res.status(200).json({ message: "Document uploaded successfully" });
  } catch (error) {
    console.log(error);
    if (error.errors) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res
      .status(500)
      .json({ message: "Failed to upload document. Please try again later." });
  }
};

const photoView = async (req, res) => {
  try {
    const { studentId } = req.query;

    const admission = await Admission.findById(studentId)
    const student = await Student.findById(admission.student);
    // const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const documentPath = student.document.photo;
    if (!documentPath) {
      return res.status(404).json({ message: "Photo not found" });
    }

    if (!fs.existsSync(documentPath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    const fileExtension = path.extname(documentPath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    if (!mimeTypes[fileExtension]) {
      return res.status(400).json({ message: "Invalid file type." });
    }

    res.contentType(mimeTypes[fileExtension]);

    const fileStream = fs.createReadStream(documentPath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      console.error("Error while streaming the file:", error);
      res.status(500).json({ message: "Error streaming the photo" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { documentupload, documentview, photoUpload, photoView };