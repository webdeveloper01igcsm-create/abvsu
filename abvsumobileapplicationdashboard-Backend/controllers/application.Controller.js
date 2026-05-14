const crypto = require("crypto");
const {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
} = require("../utils/razorpayGateway");
const Payment = require("../models/Payment");
const Application = require("../models/Application");
const Admission = require("../models/Admission");
const AcademicDoc = require("../models/AcademicDoc");
const path = require("path");
const fs = require("fs");
const StudentMarks = require("../models/StudentMarks");
const {
  downProvisionalCertificate,
  downCourseCompletionCertificate,
  downMigrationCertificate,
  downSecondDegreeCertificate,
} = require("../utils/Generator/pdfDownload");
const {
  createProvisionalCertificate,
  createCourseCompletionCertificate,
  createMigrationCertificate,
  createSecondDegreeCertificate,
} = require("../utils/Generator/pdfGenerator");
const { getCGPA } = require("../lib/Calculate/Sgpa");
const ProvSerial = require("../models/ProvSerial");
const Session = require("../models/Session");

const resolveLegacyApiBaseUrl = (req) => {
  const envBase = process.env.BACKEND_URL || process.env.BASE_URL;
  if (envBase) {
    return String(envBase).replace(/\/$/, "");
  }

  const forwardedProto = (req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host");

  if (host) {
    return `${protocol}://${host}`;
  }

  return "https://sgtu.ac.in/api";
};

const findAcademicDocWithLegacyAliases = async (documentName) => {
  const rawName = String(documentName || "").trim();
  if (!rawName) return null;

  const lowered = rawName.toLowerCase();
  const aliasSet = new Set([rawName]);

  if (lowered === "provision certificate") {
    aliasSet.add("Provisional Certificate");
  }
  if (lowered === "provisional certificate") {
    aliasSet.add("Provision Certificate");
  }

  return AcademicDoc.findOne({ name: { $in: Array.from(aliasSet) } });
};

// CREATE a new application
exports.createApp = async (req, res) => {
  try {
    const { documentApplied } = req.body;
    const application = new Application({
      admission: req.user.id,
      documentApplied: { name: documentApplied.name },
    });

    const student = await Admission.findById(req.user.id).populate("student");
    const academicDoc = await AcademicDoc.findById(documentApplied.id);

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const order_id = Date.now();
    const currency = "INR";
    const amount = academicDoc.fee;
    const apiBase = resolveLegacyApiBaseUrl(req);
    const redirect_url = `${apiBase}/payment/verify-docs`;
    const cancel_url = `${apiBase}/payment/verify-docs`;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: String(order_id),
      notes: { service: "application", local_order_id: String(order_id) },
    });

    const payment = await Payment.create({
      student_id: student.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "Application",
      payment_purpose: "Payment for Application",
      status_message: "Payment initiated for Application",
    });

    application.payment = payment._id;

    await application.save();
    const formHTML = buildRazorpayAutoSubmitHtml({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: "SGTU",
      description: "Application Payment",
      customerName: student.student.name,
      customerEmail: "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create application" });
  }
};

// READ all applications - For admin
exports.allApp = async (req, res) => {
  try {
    const applications = await Application.find({})
      .select(
        "documentApplied admission amountPaid dateOfApply paymentVerified",
      )
      .sort({ createdAt: -1 })
      .populate("admission", "-_id enrollmentNumber")
      .populate("payment", "order_id");
    res.status(200).json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// READ all applications - For Student
exports.allAppStudent = async (req, res) => {
  try {
    const applications = await Application.find({
      admission: req.user.id,
    })
      .select(
        "documentApplied.name status amountPaid dateOfApply supportingDocuments",
      )
      .populate("payment", "trans_date");
    res.status(200).json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// READ single application by ID
exports.getApp = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .select(
        "-_id paymentVerified amountPaid status dateOfApply documentApplied generatedFile supportingDocuments",
      )
      .populate([
        {
          path: "admission",
          select: "enrollmentNumber student course stream session -_id",
          populate: [
            { path: "student", select: "name -_id" },
            { path: "course", select: "-_id" },
            { path: "session", select: "-_id session" },
            { path: "stream" },
          ],
        },
        {
          path: "payment",
          select: "-_id order_id order_status amount currency",
        },
      ]);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.status(200).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch application" });
  }
};

// UPDATE PAYMENT STATUS
exports.updatePayment = async (req, res) => {
  try {
    const { id, paymentVerified } = req.body;

    const application = await Application.findById(id).populate("payment");

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    application.paymentVerified = Boolean(paymentVerified);

    if (application.paymentVerified) {
      application.status = "paid";

      const paymentAmount = Number(application.payment?.amount);
      if (
        Number.isFinite(paymentAmount) &&
        paymentAmount > 0 &&
        Number(application.amountPaid || 0) <= 0
      ) {
        application.amountPaid = paymentAmount;
      }
    }

    const updatedApplication = await application.save();

    if (!updatedApplication) {
      return res.status(404).json({ error: "Application not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Payment status updated succesfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update payment status" });
  }
};

// GENERATE DOCUMENT
exports.generateDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateOfIssue } = req.body;

    const application = await Application.findById(id)
      .select("admission paymentVerified documentApplied")
      .populate([
        {
          path: "admission",
          select: "student enrollmentNumber",
          populate: [
            { path: "student", select: "-_id name fatherName" },
            { path: "course", select: "name streamName duration" },
            { path: "session", select: "session year" },
            { path: "stream", select: "name" },
          ],
        },
      ]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.paymentVerified) {
      return res.status(400).json({ error: "Payment not verified yet" });
    }
    const doc = await AcademicDoc.findOne({
      name: application.documentApplied.name,
    });

    if (!doc) {
      return res.status(404).json({ error: "Academic document not found" });
    }
    // need to add the serial number in year of issue need to calucate
    const serailSession = await Session.findOne({
      year:
        application.admission.session.year +
        application.admission.course.duration.inYears -
        1,
    });
    // console.log(application.admission.course)
    // return
    const series = await ProvSerial.findOne({
      session: serailSession._id,
      // session: application.admission.session._id,
      course: application.admission.course._id,
      stream: application.admission.stream?._id || null,
      academicDoc: doc._id,
    });
    // console.log(series, serailSession.year)
    // return;

    if (!series) {
      return res
        .status(400)
        .json({ error: "No serial number series found for this combination" });
    }

    let nextNumber = parseInt(series.lastNumber, 10) + 1;

    // pad with zeros (assuming 4 digit format like 0001)
    const paddedNumber = String(nextNumber).padStart(4, "0");

    // 🔹 Step 3: Construct serial number
    const serialNumber = `${series.prefix}${paddedNumber}`;
    // console.log("Generated Serial Number:", serialNumber);

    // update lastNumber in DB
    series.lastNumber = paddedNumber;
    await series.save();

    function reverseDateString(dateString) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateString;
    }

    const appData = {
      serialNumber: serialNumber,
      studentName: application.admission?.student?.name,
      enrollmentNo: application.admission?.enrollmentNumber,
      course: application.admission?.course?.name,
      streamName: application.admission?.stream?.name || "",
      academicSession: serailSession.year + 1, // need to recaluate
      //academicSession: application.admission?.session?.session, // need to recaluate
      guardianName: application.admission?.student?.fatherName || "",
      cgpa: null,
      dateOfIssue: reverseDateString(dateOfIssue),
    };

    let pdfBytes;
    const docType = application.documentApplied?.name?.toLowerCase();

    switch (docType) {
      case "provision certificate":
      case "provisional certificate":
        const marks = await StudentMarks.find({
          admission: application.admission._id,
        })
          .select("marks -_id")
          .populate("marks.subjectId", "-_id maxMarks credits")
          .lean();

        const allSemestersMarks = marks.map((d) => d.marks);

        const CGPA = getCGPA(allSemestersMarks);
        appData.cgpa = CGPA === null ? "N/A" : CGPA;
        pdfBytes = await createProvisionalCertificate(appData);
        break;
      case "course completion certificate":
        pdfBytes = await createCourseCompletionCertificate(appData);
        break;
      case "migration certificate":
        pdfBytes = await createMigrationCertificate(appData);
        break;
      case "second degree certificate":
        pdfBytes = await createSecondDegreeCertificate(appData);
        break;
      default:
        return res.status(400).json({ error: "Invalid document type" });
    }

    const uploadDir = path.join(process.cwd(), "document", "generated");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${application._id}-${docType}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    application.generatedFile = `/generated/${fileName}`;
    application.status = "generated";
    application.dateOfIssue = dateOfIssue || new Date();
    application.serialNumber = serialNumber;
    application.cgpa = appData.cgpa || null;
    await application.save();

    res.status(200).json({
      success: true,
      message: "Document generated successfully",
      fileUrl: application.generatedFile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate document" });
  }
};

// PRINT DOCUMENT
exports.printDoc = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .select(
        "admission paymentVerified documentApplied status serialNumber cgpa dateOfIssue",
      )
      .populate([
        {
          path: "admission",
          select: "student enrollmentNumber",
          populate: [
            { path: "student", select: "-_id name fatherName" },
            { path: "course", select: "name streamName duration" },
            { path: "session", select: "session year" },
            { path: "stream", select: "name" },
          ],
        },
      ]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      !application.paymentVerified ||
      (application.status !== "sent" && application.status !== "generated")
    ) {
      return res.status(400).json({
        error: "Payment not verified yet or Document has not been generated",
      });
    }
    const serailSession = await Session.findOne({
      year:
        application.admission.session.year +
        application.admission.course.duration.inYears -
        1,
    });

    function formatDateWithFullMonth(dateString) {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const parts = dateString.split("-");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const monthName = months[parseInt(month, 10) - 1];
        return `${day} ${monthName} ${year}`;
      }

      return dateString;
    }

    const appData = {
      serialNumber: application.serialNumber,
      studentName: application.admission?.student?.name,
      enrollmentNo: application.admission?.enrollmentNumber,
      course: application.admission?.course?.name,
      streamName: application.admission?.stream?.name || "",
      academicSession: serailSession.year + 1,
      guardianName: application.admission?.student?.fatherName || "",
      cgpa: application.cgpa,
    };

    let pdfBytes;
    const docType = application.documentApplied?.name?.toLowerCase();

    switch (docType) {
      case "provision certificate":
      case "provisional certificate":
        appData.dateOfIssue = application.dateOfIssue
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-");
        pdfBytes = await downProvisionalCertificate(appData);
        break;
      case "course completion certificate":
        if (application?.admission.course?.name) {
          appData.course = "the Diploma in";
          appData.streamName = "Agriculture";
        }
        appData.dateOfIssue = formatDateWithFullMonth(
          application.dateOfIssue
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-"),
        );
        pdfBytes = await downCourseCompletionCertificate(appData);
        break;
      case "migration certificate":
        pdfBytes = await downMigrationCertificate(appData);
        break;
      case "second degree certificate":
        pdfBytes = await downSecondDegreeCertificate(appData);
        break;
      default:
        return res.status(400).json({ error: "Invalid document type" });
    }

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const fileName = `${application.serialNumber}-${docType}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    // console.log(filePath)
    fs.writeFileSync(filePath, pdfBytes);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:" + err);
        res.status(500).send("Error sending File");
      }
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete PDF", err);
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate document" });
  }
};

exports.createCashApplication = async (req, res) => {
  try {
    const { enrollmentNumber, documentApplied } = req.body;

    if (!enrollmentNumber) {
      return res.status(400).json({ error: "Enrollment is required" });
    }

    // 🔹 Student admission fetch
    const admission = await Admission.findOne({ enrollmentNumber }).populate(
      "student course session stream",
    );

    if (!admission) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 🔹 Create application (verified)
    const application = new Application({
      admission: admission._id,
      documentApplied: { name: documentApplied },
      amountPaid: 1,
      // cgpa: cgpa || null,
      status: "paid",
    });

    // 🔹 Get document type reference
    const doc = await findAcademicDocWithLegacyAliases(
      application.documentApplied.name,
    );

    if (!doc) {
      return res.status(404).json({ error: "Academic document not found" });
    }

    await application.save();

    res.status(201).json({
      success: true,
      message: "Cash application created successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to create cash application",
    });
  }
};

exports.createCashApplicationAndGenerateDoc = async (req, res) => {
  try {
    const { enrollmentNumber, documentApplied, cgpa, dateOfIssue } = req.body;

    if (!enrollmentNumber) {
      return res.status(400).json({ error: "Enrollment is required" });
    }

    // 🔹 Student admission fetch
    const admission = await Admission.findOne({ enrollmentNumber }).populate(
      "student course session stream",
    );

    if (!admission) {
      return res.status(404).json({ error: "Student not found" });
    }

    function reverseDateString(dateString) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateString;
    }

    function formatDateWithFullMonth(dateString) {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const parts = dateString.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const monthName = months[parseInt(month, 10) - 1];
        return `${day} ${monthName} ${year}`;
      }

      return dateString;
    }

    // 🔹 Create application (verified)
    const application = new Application({
      admission: admission._id,
      documentApplied: { name: documentApplied },
      paymentVerified: true,
      amountPaid: 1,
      cgpa: cgpa || null,
      dateOfIssue: dateOfIssue || new Date(),
      status: "paid",
    });

    // 🔹 Get document type reference
    const doc = await findAcademicDocWithLegacyAliases(
      application.documentApplied.name,
    );
    if (!doc) {
      return res.status(404).json({ error: "Academic document not found" });
    }

    const serailSession = await Session.findOne({
      year: admission.session.year + admission.course.duration.inYears - 1,
    });

    // 🔹 Get series for serial number
    const series = await ProvSerial.findOne({
      session: serailSession._id,
      course: admission.course._id,
      stream: admission?.stream?._id || null,
      academicDoc: doc._id,
    });

    if (!series) {
      return res
        .status(400)
        .json({ error: "No serial number series found for this combination" });
    }

    let nextNumber = parseInt(series.lastNumber, 10) + 1;
    const paddedNumber = String(nextNumber).padStart(4, "0");
    const serialNumber = `${series.prefix}${paddedNumber}`;
    series.lastNumber = paddedNumber;
    await series.save();

    const appData = {
      serialNumber,
      studentName: admission?.student?.name,
      enrollmentNo: admission?.enrollmentNumber,
      course: admission.course?.name,
      streamName: admission?.stream?.name || "",
      academicSession: serailSession.year + 1,
      guardianName: admission?.student?.fatherName || "",
      cgpa: cgpa || "N/A",
    };

    let pdfBytes;

    switch (documentApplied.toLowerCase()) {
      case "provision certificate":
        ((appData.dateOfIssue = reverseDateString(dateOfIssue)),
          (pdfBytes = await createProvisionalCertificate(appData)));
        break;
      case "course completion certificate":
        if (admission.course?.name) {
          appData.course = "the Diploma in";
          appData.streamName = "Agriculture";
        }
        appData.dateOfIssue = formatDateWithFullMonth(dateOfIssue);
        pdfBytes = await createCourseCompletionCertificate(appData);
        break;
      case "migration certificate":
        pdfBytes = await createMigrationCertificate(appData);
        break;
      case "second degree certificate":
        pdfBytes = await createSecondDegreeCertificate(appData);
        break;
      default:
        return res.status(400).json({ error: "Invalid document type" });
    }

    // 🔹 Save PDF
    const uploadDir = path.join(process.cwd(), "document", "generated");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${application._id}-${documentApplied}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    // 🔹 Update application with doc info
    application.generatedFile = `/generated/${fileName}`;
    application.status = "generated";
    application.serialNumber = serialNumber;
    application.cgpa = cgpa || null;
    await application.save();

    res.status(201).json({
      success: true,
      message: "Cash application created and document generated successfully",
      fileUrl: application.generatedFile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to create cash application and generate document",
    });
  }
};

// SEND document to the Student
exports.sendDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.generatedFile) {
      return res.status(400).json({ error: "Document not generated yet" });
    }
    application.documentApplied.fileUrl = application.generatedFile;
    application.status = "sent";
    application.sentAt = new Date();

    await application.save();

    res.status(200).json({
      message: "Application sent successfully",
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send document" });
  }
};

// View Document - Admin
exports.ViewDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.generatedFile) {
      return res.status(400).json({ error: "Document not generated yet" });
    }

    // file ka absolute path banao
    const filePath = path.join(
      process.cwd(),
      "document",
      application.generatedFile,
    );
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.sendFile(filePath);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// View Document - Student
exports.ViewDocumentForStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application || application.admission.toString() !== req.user.id) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.generatedFile || application.status !== "sent") {
      return res.status(400).json({ error: "Document not generated yet" });
    }

    // file ka absolute path banao
    const filePath = path.join(
      process.cwd(),
      "document",
      application.generatedFile,
    );
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.sendFile(filePath);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Download Document
exports.DownloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.generatedFile) {
      return res.status(400).json({ error: "Document not generated yet" });
    }

    // file ka absolute path banao
    const filePath = path.join(
      process.cwd(),
      "documents",
      application.generatedFile,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // file ko download karwao
    return res.download(filePath, application.documentApplied.name + ".pdf");
    // ya sirf view ke liye
    // return res.sendFile(filePath);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// UPDATE application by ID
exports.updateApp = async (req, res) => {
  try {
    const updatedData = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true },
    );

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.status(200).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update application" });
  }
};

// DELETE application by ID
exports.deleteApp = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.status(200).json({ message: "Application deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete application" });
  }
};

exports.uploadSupportingDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const application = await Application.findById(id);

    if (!application) {
      // Delete the uploaded file if application not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Application not found" });
    }

    // If there's an existing supporting document, delete it
    if (
      application.supportingDocuments &&
      application.supportingDocuments.fileUrl
    ) {
      const existingFilePath = path.join(
        process.cwd(),
        "uploads",
        application.supportingDocuments.fileUrl,
      );
      if (fs.existsSync(existingFilePath)) {
        fs.unlinkSync(existingFilePath);
      }
    }

    // Update application with new supporting document details
    application.supportingDocuments.fileUrl = path.basename(req.file.path);

    await application.save();

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload supporting document" });
  }
};

exports.getSupportingDocumentAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      !application.supportingDocuments ||
      !application.supportingDocuments.fileUrl
    ) {
      return res.status(404).json({ error: "No supporting document found" });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      application.supportingDocuments.fileUrl,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch supporting document" });
  }
};

exports.getSupportingDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (req.user.id !== application.admission.toString()) {
      return res.status(403).json({
        message: "Access denied. Not authorized to view this Doc.",
      });
    }

    if (
      !application.supportingDocuments ||
      !application.supportingDocuments.fileUrl
    ) {
      return res.status(404).json({ error: "No supporting document found" });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      application.supportingDocuments.fileUrl,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch supporting document" });
  }
};
