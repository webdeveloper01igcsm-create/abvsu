const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Student = require("../models/Student");
const Admission = require("../models/Admission");
const StudentMarks = require("../models/StudentMarks");
const { jsonError } = require("../utils/apiResponse");
const Result = require("../models/Result");
const Payment = require("../models/Payment");
const {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
  verifyRazorpaySignature,
} = require("../utils/razorpayGateway");
const { z } = require("zod");
const axios = require("axios");
require("dotenv").config();
const Otp = require("../models/Otp");
const sendPushNotification = require("../utils/sendExpoNotification");
const { SANDBOX_API_KEY, SANDBOX_API_SECRET } = process.env;
const LICENSE_DAYS = 365;
const LICENSE_RENEWAL_AMOUNT = 599;

const normalizeBaseUrl = (value) => (value ? value.replace(/\/$/, "") : "");

const buildPaymentForm = buildRazorpayAutoSubmitHtml;

const addDays = (sourceDate, days) => {
  const date = new Date(sourceDate);
  date.setDate(date.getDate() + days);
  return date;
};

const calculateStudentSessionState = (student) => {
  const now = new Date();
  const undertakingPending = !student?.undertaking?.accepted;
  const endDate =
    student?.license?.endDate ||
    student?.subscriptionDetails?.expiryDate ||
    null;
  const endDateObj = endDate ? new Date(endDate) : null;
  const licenseExpired = !endDateObj || endDateObj.getTime() < now.getTime();
  const daysLeft = endDateObj
    ? Math.max(
        0,
        Math.ceil(
          (endDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return {
    undertakingPending,
    licenseExpired,
    daysLeft,
    renewalAmount: LICENSE_RENEWAL_AMOUNT,
    licenseStartDate:
      student?.license?.startDate || student?.appRegisDetails?.date || null,
    licenseEndDate: endDateObj,
  };
};

const buildMobileStudentProfile = (student, admission) => {
  const courseName = admission?.course?.name ?? null;
  const streamName = admission?.stream?.name ?? null;
  const courseTypeName = admission?.course?.courseTypeId?.name ?? null;

  return {
    enrollmentNumber: admission?.enrollmentNumber ?? null,
    fatherName: student?.fatherName ?? null,
    courseName,
    streamName,
    courseTypeName,
    admissionId: admission?._id ? String(admission._id) : null,
  };
};

const signupSchema = z.object({
  enrollmentNumber: z.string().min(1, "Enrollment Number is required"),
  aadharNumber: z
    .number()
    .gt(100000000000, "Aadhar Number must be a 12-digit number")
    .lte(999999999999, "Aadhar Number must be a 12-digit number"),
});

const loginSchema = z.object({
  enrollmentNumber: z.string().min(1, "Enrollment Number is required"),
  aadharNumber: z
    .number()
    .gt(100000000000, "Aadhar Number must be a 12-digit number")
    .lte(999999999999, "Aadhar Number must be a 12-digit number"),
  pushToken: z.string().optional(),
});

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fatherName: z.string().min(1, "Father name is required"),
  motherName: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  enrollmentNumber: z.string().min(1, "Enrollment Number is required"),

  aadharNumber: z
    .number()
    .refine(
      (v) => v.toString().length === 12,
      "Aadhar Number must be a 12-digit number",
    ),

  mobileNumber: z
    .number()
    .refine(
      (v) => v.toString().length === 10,
      "Mobile Number must be a 10-digit number",
    ),

  email: z.string().email("Invalid email address"),

  session: z.string().length(24, "Invalid session ID"),
  course: z.string().length(24, "Invalid course ID"),
  stream: z.string().length(24, "Invalid course ID").optional().nullable(),
});

const registerStudent = async (req, res) => {
  const { enrollmentNumber, aadharNumber } = req.body;

  // Validate the request body with Zod
  try {
    signupSchema.parse({ enrollmentNumber, aadharNumber });
  } catch (err) {
    return res.status(400).json({ message: err.errors[0].message });
  }

  try {
    // Check if the student exists
    const validStudent = await Admission.findOne({ enrollmentNumber }).populate(
      "student",
      "aadharNumber subscriptionDetails",
    );

    if (!validStudent) {
      return res
        .status(400)
        .json({ message: "Enrollment number does not exist" });
    }

    // Validate Aadhaar number
    if (validStudent.student.aadharNumber !== aadharNumber) {
      return res.status(400).json({ message: "Aadhaar number does not match" });
    }

    // Check subscription status
    if (validStudent.student.subscriptionDetails.isActive) {
      return res
        .status(409)
        .json({ message: "Account already activated. Kindly Login" });
    }

    // Check for existing OTP requests
    const existingOtp = await Otp.findOne({ enrollmentNumber });
    if (existingOtp) {
      const timeElapsed = new Date() - new Date(existingOtp.createdAt);
      if (timeElapsed < 300000) {
        // 5 minutes
        return res.status(400).json({
          success: false,
          message: "Please wait before requesting another OTP.",
        });
      } else {
        // Remove expired OTP entry
        await Otp.deleteOne({ enrollmentNumber });
      }
    }

    // Authenticate with API to get access token
    const authHeaders = {
      "x-api-version": "2.0",
      "x-api-secret": SANDBOX_API_SECRET,
      "x-api-key": SANDBOX_API_KEY,
    };

    const authResponse = await axios.post(
      "https://api.sandbox.co.in/authenticate",
      null,
      { headers: authHeaders },
    );

    const { access_token } = authResponse.data;
    if (!access_token) {
      return res.status(500).json({
        message: "Failed to retrieve access token. Please try again later.",
      });
    }

    // Send OTP request
    const otpHeaders = {
      "x-api-version": "2.0",
      "x-api-key": SANDBOX_API_KEY,
      Authorization: access_token,
    };

    const otpBody = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
      aadhaar_number: `${aadharNumber}`,
      consent: "y",
      reason: "Student confirmation for Registration purpose - SGTU",
    };

    const otpResponse = await axios.post(
      "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp",
      otpBody,
      { headers: otpHeaders },
    );

    if (otpResponse.data && otpResponse.data.code === 200) {
      const referenceId = otpResponse.data.data.reference_id;

      // Save OTP details in the database
      const otp = new Otp({
        enrollmentNumber,
        referenceId,
      });

      await otp.save();
      return res.status(200).json({
        message: "OTP sent successfully",
        referenceId,
      });
    } else {
      return res.status(400).json({
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error(
      "Error during student registration:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "An error occurred. Please try again later.",
      error: error.response?.data || error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { reference_id, otp } = req.body;

    // Check if the reference ID exists in the database
    const checkRef = await Otp.findOne({ referenceId: reference_id });
    if (!checkRef) {
      return res.status(400).json({
        message: "Kindly generate registration again.",
      });
    }
    const { enrollmentNumber } = checkRef;

    // Send OTP for verification to Sandbox API
    const authHeaders = {
      "x-api-version": "2.0",
      "x-api-secret": SANDBOX_API_SECRET,
      "x-api-key": SANDBOX_API_KEY,
    };

    // Authenticate to get the access token
    const authResponse = await axios.post(
      "https://api.sandbox.co.in/authenticate",
      null,
      { headers: authHeaders },
    );

    const { access_token } = authResponse.data;
    if (!access_token) {
      return res.status(500).json({
        message: "Failed to retrieve access token. Please try again later.",
      });
    }

    // Verify OTP
    const verifyHeaders = {
      "x-api-version": "2.0",
      "x-api-key": SANDBOX_API_KEY,
      Authorization: access_token,
    };

    const verifyBody = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
      reference_id,
      otp,
    };
    // console.log("check 1");

    const verifyResponse = await axios.post(
      "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify",
      verifyBody,
      { headers: verifyHeaders },
    );

    if (verifyResponse.data && verifyResponse.data.code === 200) {
      // OTP verified successfully
      console.log(checkRef.enrollmentNumber);

      // Find the student in the database using the enrollment number from OTP
      const admission = await Admission.findOne({
        enrollmentNumber: checkRef.enrollmentNumber,
      });
      if (!admission) {
        return res.status(404).json({ message: "Admission not found." });
      }
      const student = await Student.findById(admission.student);
      if (!student) {
        return res.status(404).json({ message: "Student not found." });
      }

      // Calculate the expiry date (one year from the current date)
      const currentDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(currentDate.getFullYear() + 1);
      expiryDate.setDate(expiryDate.getDate() - 1);

      const updatedStudent = await Student.findOneAndUpdate(
        { _id: admission.student },
        {
          "appRegisDetails.date": currentDate,
          "appRegisDetails.status": true,
          "subscriptionDetails.isActive": true,
          "subscriptionDetails.expiryDate": expiryDate,
        },
        { new: true },
      );

      if (!updatedStudent) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Student details updated successfully. Now you can Login",
      });
    } else {
      return res.status(400).json({
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error(
      "Error verifying OTP:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "An error occurred while verifying OTP.",
      error: error.response?.data || error.message,
    });
  }
};

// updated
const loginStudent = async (req, res) => {
  const { enrollmentNumber, aadharNumber, pushToken } = req.body;
  if (!enrollmentNumber || !aadharNumber) {
    return res.status(400).json({
      message: "Enrollment number, Aadhaar number  are required.",
    });
  }

  try {
    loginSchema.parse({ enrollmentNumber, aadharNumber, pushToken });
  } catch (err) {
    return res.status(400).json({ message: err.errors[0].message });
  }

  try {
    const student = await Student.findOne({
      aadharNumber,
    });

    if (
      !student ||
      (student?.appRegisDetails?.date !== null &&
        !student?.appRegisDetails?.status)
    ) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    const admission = await Admission.findOne({
      student: student._id,
      enrollmentNumber,
    }).populate([
      {
        path: "course",
        select: "name courseTypeId -_id",
        populate: { path: "courseTypeId", select: "name -_id" },
      },
      { path: "stream", select: "name -_id" },
    ]);
    if (!admission) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    if (student.appRegisDetails.status) {
      if (pushToken && !student.pushToken?.includes(pushToken)) {
        student.pushToken = student.pushToken || [];
        student.pushToken.push(pushToken);
        await student.save();
      }
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          "Login Successful",
          `Welcome, ${student.name}!`,
        );
      }

      const token = jwt.sign(
        {
          id: admission._id,
          name: student.name,
          enrollmentNumber: admission.enrollmentNumber,
          aadharNumber: student.aadharNumber,
        },
        process.env.STUDENT_SECRET,
        { expiresIn: "6h" },
      );

      const studentObj = student.toObject();
      delete studentObj.pushToken;
      delete studentObj._id;
      delete studentObj.__v;

      const admissionObj = admission.toObject();
      delete admissionObj._id;
      delete admissionObj.__v;
      delete admissionObj.student;
      delete admissionObj.admissionDate;
      delete admissionObj.status;

      const mobileProfile = buildMobileStudentProfile(studentObj, admission);
      Object.assign(studentObj, mobileProfile);
      studentObj.admission = admissionObj;
      return res.status(200).json({
        token,
        message: "Login successful",
        name: `${student.name}`,
        id: `${admission._id}`,
        student: studentObj,
      });
    } else {
      return res
        .status(403)
        .json({ message: "Kindly register your account first." });
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// updated
const allStudent = async (req, res) => {
  try {
    const { enrollmentNumber } = req.query;
    const filter = {};

    if (enrollmentNumber) {
      filter.enrollmentNumber = enrollmentNumber;
    }

    const students = await Admission.find(filter)
      .populate(
        "student",
        "name enrollmentNumber fatherName mobileNumber email aadharNumber",
      )
      .populate("course", "name")
      .populate("stream", "name")
      .populate("session", "session");
    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};

// updated
const addStudent = async (req, res) => {
  try {
    const {
      name,
      fatherName,
      motherName,
      gender,
      dateOfBirth,
      enrollmentNumber,
      aadharNumber,
      mobileNumber,
      email,
      session,
      course,
      stream,
    } = req.body;

    // Validate input using Zod schema
    studentSchema.parse({
      name,
      fatherName,
      motherName,
      gender,
      dateOfBirth,
      enrollmentNumber,
      aadharNumber,
      mobileNumber,
      email,
      session,
      course,
      stream,
    });

    // Create and save the student
    let student = await Student.findOne({ aadharNumber });
    if (!student) {
      // if student is not there create one
      student = new Student({
        name,
        fatherName,
        motherName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        aadharNumber,
        mobileNumber,
        email,
      });
      await student.save();
    } else {
      if (
        student.name !== name.trim() ||
        student.fatherName !== fatherName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhar Number already exists with different details. Please check the details.",
        });
      }
    }

    const admission = new Admission({
      student: student._id,
      enrollmentNumber,
      session,
      course,
      stream,
    });

    await admission.save();

    return res.status(201).json({
      success: true,
      message: "Student added successfully.",
      admission,
      student,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please use a different ${field}.`,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const editStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided.",
      });
    }

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }
    const marks = await StudentMarks.find({ admission: id });
    const result = await Result.find({ admission: id });

    if (marks.length > 0 || result.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot edit student details as marks or results have been recorded.",
      });
    }

    const studentId = admission.student;

    const studentFields = [
      "name",
      "fatherName",
      "motherName",
      "gender",
      "dateOfBirth",
      "aadharNumber",
      "mobileNumber",
      "email",
    ];

    const admissionFields = ["enrollmentNumber", "course", "stream", "session"];

    const studentUpdates = {};
    const admissionUpdates = {};

    for (const key of Object.keys(updates)) {
      if (studentFields.includes(key)) {
        studentUpdates[key] = updates[key];
      }
      if (admissionFields.includes(key)) {
        admissionUpdates[key] = updates[key];
      }
    }

    let updatedStudent = null;
    let updatedAdmission = null;

    if (Object.keys(studentUpdates).length > 0) {
      updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        studentUpdates,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    if (Object.keys(admissionUpdates).length > 0) {
      updatedAdmission = await Admission.findByIdAndUpdate(
        id,
        admissionUpdates,
        {
          new: true,
          runValidators: true,
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Student & Admission updated successfully",
      student: updatedStudent || null,
      admission: updatedAdmission || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please use a different ${field}.`,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Student ID is required" });
    }

    const marksCount = await StudentMarks.countDocuments({ admission: id });
    const resultCount = await Result.countDocuments({ admission: id });

    if (marksCount > 0 || resultCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot edit/delete student as marks or results have been recorded.",
      });
    }

    const student = await Admission.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admission deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const toggleStudentStatus = async (req, res) => {
  const { enrollmentNumber } = req.body;

  if (!enrollmentNumber) {
    return res.status(400).json({ message: "Enrollment number is required." });
  }

  try {
    const student = await Student.findOne({ enrollmentNumber });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.appRegisDetails.status = !student.appRegisDetails.status;
    await student.save();

    const statusMessage = student.appRegisDetails.status
      ? "activated"
      : "deactivated";

    return res.status(200).json({
      message: `Student app registration has been ${statusMessage}.`,
      status: student.appRegisDetails.status,
    });
  } catch (err) {
    console.error("Error toggling student status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentDetails = async (req, res) => {
  try {
    const { id } = req.user;

    const admission = await Admission.findById(id)
      .select("enrollmentNumber student session course stream -_id")
      .populate([
        {
          path: "student",
          select:
            "name fatherName motherName gender dateOfBirth aadharNumber email mobileNumber undertaking license subscriptionDetails appRegisDetails -_id",
        },
        { path: "session", select: "session -_id" },
        {
          path: "course",
          select: "name duration courseTypeId -_id",
          populate: { path: "courseTypeId", select: "name -_id" },
        },
        { path: "stream", select: "name -_id" },
      ]);

    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    const mobileProfile = buildMobileStudentProfile(
      admission?.student,
      admission,
    );

    return res.status(200).json({
      admission,
      student: {
        id: admission?.student?._id ? String(admission.student._id) : null,
        name: admission?.student?.name ?? null,
        ...mobileProfile,
      },
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentSessionState = async (req, res) => {
  try {
    const admission = await Admission.findById(req.user.id)
      .select("enrollmentNumber student")
      .populate({
        path: "student",
        select:
          "name fatherName undertaking license subscriptionDetails appRegisDetails",
      });

    if (!admission || !admission.student) {
      return jsonError(res, 404, "Student not found");
    }

    const state = calculateStudentSessionState(admission.student);

    return res.status(200).json({
      enrollmentNumber: admission.enrollmentNumber,
      studentName: admission.student.name,
      fatherName: admission.student.fatherName,
      ...state,
    });
  } catch (error) {
    console.error("Error getting student session state:", error);
    return res.status(500).json({ message: "Failed to get student session" });
  }
};

const submitUndertaking = async (req, res) => {
  try {
    const accepted = String(req.body.accepted) === "true";
    if (!accepted) {
      return res.status(400).json({ message: "Please accept undertaking" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Signature upload is required" });
    }

    const admission = await Admission.findById(req.user.id).select("student");
    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    const existingStudent = await Student.findById(admission.student).select(
      "undertaking",
    );
    if (existingStudent?.undertaking?.accepted) {
      return res.status(409).json({ message: "Undertaking already submitted" });
    }

    const now = new Date();
    const student = await Student.findByIdAndUpdate(
      admission.student,
      {
        "undertaking.accepted": true,
        "undertaking.acceptedAt": now,
        "undertaking.signatureUrl": `/uploads/${req.file.filename}`,
      },
      { new: true },
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ message: "Undertaking submitted" });
  } catch (error) {
    console.error("Error submitting undertaking:", error);
    return res.status(500).json({ message: "Failed to submit undertaking" });
  }
};

const createLicenseRenewalOrder = async (req, res) => {
  try {
    const admission = await Admission.findById(req.user.id).populate({
      path: "student",
      select: "name undertaking",
    });

    if (!admission || !admission.student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!admission.student.undertaking?.accepted) {
      return res
        .status(400)
        .json({ message: "Please complete undertaking first" });
    }

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const apiBase =
      normalizeBaseUrl(process.env.BACKEND_URL) ||
      normalizeBaseUrl(process.env.BASE_URL) ||
      "https://api.sikkimglobaltechnicaluniversity.co.in";

    if (!keyId || !keySecret) {
      return res
        .status(500)
        .json({ message: "Payment gateway configuration error" });
    }

    const amount = LICENSE_RENEWAL_AMOUNT;
    const currency = "INR";
    const order_id = `LIC${Date.now()}${crypto.randomUUID().substring(0, 6)}`;
    const redirect_url = `${apiBase}/student/license-razorpay-response`;
    const cancel_url = `${apiBase}/student/license-razorpay-response`;

    const rzpOrder = await createRazorpayOrder({
      amountRupees: amount,
      receipt: order_id,
      notes: { service: "license-renewal", local_order_id: order_id },
    });

    await Payment.create({
      student_id: admission.student._id,
      order_id: rzpOrder.id,
      currency,
      amount,
      order_status: "Pending",
      payment_source: "License Renewal",
      payment_purpose: "Payment for License Renewal",
      status_message: "Payment initiated for License Renewal",
    });

    const formHTML = buildPaymentForm({
      keyId,
      amountPaise: rzpOrder.amount,
      orderId: rzpOrder.id,
      callbackUrl: redirect_url,
      cancelUrl: cancel_url,
      name: process.env.PAYMENT_BRAND_NAME || "ABVSU",
      description: "License Renewal",
      customerName: admission.student.name,
      customerEmail: "",
    });

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(formHTML);
  } catch (error) {
    console.error("Error creating license renewal payment:", error);
    return res.status(500).json({ message: "Failed to initiate renewal" });
  }
};

const handleLicenseRazorpayResponse = async (req, res) => {
  try {
    const body = req.body || {};
    const failedOrderId =
      body?.error?.metadata?.order_id ||
      body?.error?.metadata?.razorpay_order_id ||
      "";
    const orderId = body.razorpay_order_id || failedOrderId;
    const paymentId = body.razorpay_payment_id || "";
    const signature = body.razorpay_signature || "";
    const failureMessage = String(
      body?.error?.description || body?.error?.reason || "",
    ).trim();
    const isSignatureValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!orderId) {
      return res.status(400).send("Invalid payment response");
    }
    const payment = await Payment.findOne({ order_id: orderId });
    if (!payment) {
      return res.status(404).send("Payment record not found");
    }

    const orderStatus = isSignatureValid ? "Success" : "Failed";
    const normalizedOrderStatus = orderStatus.toLowerCase();
    const isSuccess = normalizedOrderStatus === "success";
    const isCancelled =
      normalizedOrderStatus === "aborted" ||
      normalizedOrderStatus === "cancelled" ||
      normalizedOrderStatus === "canceled";

    payment.tracking_id = paymentId || payment.tracking_id;
    payment.bank_ref_no = "";
    payment.order_status = orderStatus || payment.order_status;
    payment.failure_message = failureMessage;
    payment.payment_mode = "";
    payment.card_name = "";
    payment.status_code = isSignatureValid ? "200" : "400";
    payment.status_message = isSignatureValid
      ? "Payment captured"
      : "Payment failed";
    payment.currency = "INR";
    payment.amount = parseFloat(payment.amount || 0);
    payment.trans_date = new Date();
    await payment.save();

    const student = await Student.findById(payment.student_id);
    if (student && isSuccess) {
      const now = new Date();
      const currentEnd =
        student.license?.endDate || student.subscriptionDetails?.expiryDate;
      const baseDate =
        currentEnd && new Date(currentEnd).getTime() > now.getTime()
          ? new Date(currentEnd)
          : now;
      const newEndDate = addDays(baseDate, LICENSE_DAYS);

      student.license = {
        startDate: student.license?.startDate || now,
        endDate: newEndDate,
        lastRenewedAt: now,
      };
      student.subscriptionDetails.isActive = true;
      student.subscriptionDetails.expiryDate = newEndDate;
      await student.save();
    }

    const studentBase =
      normalizeBaseUrl(process.env.FRONTEND_URL) ||
      normalizeBaseUrl(process.env.STUDENT_PORTAL_URL) ||
      "https://student.sgtu.ac.in";
    let redirectUrl = `${studentBase}/authenticate/license-renewal?payment=failed`;
    if (isSuccess) {
      redirectUrl = `${studentBase}/authenticate/license-renewal?payment=success`;
    } else if (isCancelled) {
      redirectUrl = `${studentBase}/authenticate/license-renewal?cancelled=true`;
    }

    return res.redirect(303, redirectUrl);
  } catch (error) {
    console.error("Error handling license payment response:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const sendAadhaarAddressOtp = async (req, res) => {
  try {
    const { aadharNumber } = req.body;

    if (!aadharNumber || aadharNumber.toString().length !== 12) {
      return res.status(400).json({
        message: "Valid 12-digit Aadhaar number is required",
      });
    }

    const admission = await Admission.findById(req.user.id).populate(
      "student",
      "aadharNumber",
    );

    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    // Validate Aadhaar number matches student's record
    if (admission.student.aadharNumber !== aadharNumber) {
      return res.status(400).json({
        message: "Aadhaar number does not match your record",
      });
    }

    // Get authentication token from Sandbox API
    const authHeaders = {
      "x-api-version": "2.0",
      "x-api-secret": SANDBOX_API_SECRET,
      "x-api-key": SANDBOX_API_KEY,
    };

    console.log("Step 1: Authenticating with Sandbox API...");
    console.log("Auth Headers:", {
      "x-api-version": authHeaders["x-api-version"],
      "x-api-key": SANDBOX_API_KEY ? "***" : undefined,
      "x-api-secret": SANDBOX_API_SECRET ? "***" : undefined,
    });
    let authResponse;
    try {
      authResponse = await axios.post(
        "https://api.sandbox.co.in/authenticate",
        null,
        { headers: authHeaders },
      );
      console.log("Auth successful:", {
        code: authResponse.data?.code,
        transaction_id: authResponse.data?.transaction_id,
      });
    } catch (authError) {
      console.error("Auth failed:");
      console.error("Status:", authError.response?.status);
      console.error("Data:", authError.response?.data);
      console.error("Message:", authError.message);
      return res.status(500).json({
        message: "Authentication with Aadhaar gateway failed",
        authError: authError.response?.data || authError.message,
      });
    }

    const { access_token } = authResponse.data;
    if (!access_token) {
      console.error("No access token in auth response");
      return res.status(500).json({
        message: "Failed to retrieve access token. Please try again later.",
      });
    }
    console.log("Access token retrieved successfully");

    // Send OTP request for address extraction
    const otpHeaders = {
      "x-api-version": "2.0",
      "x-api-key": SANDBOX_API_KEY,
      Authorization: access_token,
    };

    const otpBody = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
      aadhaar_number: `${aadharNumber}`,
      consent: "y",
      reason: "Address verification for document dispatch - SGTU",
    };

    console.log("Step 2: Sending OTP request to Sandbox...");
    console.log("OTP Headers (without token):", {
      ...otpHeaders,
      Authorization: "***",
    });
    console.log("OTP Body:", otpBody);

    let otpResponse;
    try {
      otpResponse = await axios.post(
        "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp",
        otpBody,
        { headers: otpHeaders },
      );
      console.log("OTP sent successfully:", otpResponse.data);
    } catch (otpError) {
      console.error("OTP send failed:");
      console.error("Status:", otpError.response?.status);
      console.error("Data:", otpError.response?.data);
      console.error("Message:", otpError.message);
      return res.status(500).json({
        message: "Failed to send OTP via Aadhaar gateway",
        otpError: otpError.response?.data || otpError.message,
      });
    }

    if (otpResponse.data && otpResponse.data.code === 200) {
      const AadhaarAddressOtp = require("../models/AadhaarAddressOtp");
      const responseData = otpResponse.data?.data || {};
      const referenceId = responseData.reference_id || responseData.referenceId;
      const providerMessage = responseData.message || otpResponse.data?.message;

      // Sandbox may return code 200 with a cooldown message but without reference_id.
      // In that case, do not persist and surface a retry response to the client.
      if (!referenceId) {
        const normalizedMessage = String(providerMessage || "").toLowerCase();
        const isCooldown =
          normalizedMessage.includes("try after") ||
          normalizedMessage.includes("otp generated");

        return res.status(isCooldown ? 429 : 400).json({
          message:
            providerMessage || "OTP request accepted but reference ID was not returned",
        });
      }

      // Save OTP details only when provider reference_id is present.
      const otpRecord = new AadhaarAddressOtp({
        admissionId: admission._id,
        referenceId,
        aadhaarNumber: aadharNumber,
      });

      await otpRecord.save();

      return res.status(200).json({
        message: "OTP sent successfully to your registered mobile",
        referenceId,
      });
    }

    return res.status(400).json({
      message: "Failed to send OTP. Please try again later.",
      error: otpResponse.data?.message,
    });
  } catch (error) {
    console.error("CRITICAL ERROR in sendAadhaarAddressOtp:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("Request made but no response received");
      console.error("Request:", error.request);
    }
    return res.status(500).json({
      message: "An error occurred. Please try again later.",
      error: error.response?.data?.message || error.message,
    });
  }
};

const verifyAadhaarAddressOtp = async (req, res) => {
  try {
    const { reference_id, otp, aadhaar_number } = req.body;

    console.log("Received verify OTP request:", {
      reference_id,
      otp,
      aadhaar_number,
      body: req.body,
    });

    if (!reference_id || !otp) {
      return res.status(400).json({
        message: "Reference ID and OTP are required",
      });
    }

    const AadhaarAddressOtp = require("../models/AadhaarAddressOtp");

    // Check if the reference ID exists
    const otpRecord = await AadhaarAddressOtp.findOne({
      referenceId: reference_id,
    });
    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Get authentication token
    const authHeaders = {
      "x-api-version": "2.0",
      "x-api-secret": SANDBOX_API_SECRET,
      "x-api-key": SANDBOX_API_KEY,
    };

    const authResponse = await axios.post(
      "https://api.sandbox.co.in/authenticate",
      null,
      { headers: authHeaders },
    );

    const { access_token } = authResponse.data;
    if (!access_token) {
      return res.status(500).json({
        message: "Failed to retrieve access token. Please try again later.",
      });
    }

    // Verify OTP and fetch address
    const verifyHeaders = {
      "x-api-version": "2.0",
      "x-api-key": SANDBOX_API_KEY,
      Authorization: access_token,
    };

    const verifyBody = {
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
      reference_id: String(reference_id), // Convert to string
      otp: String(otp), // Convert to string
    };

    console.log("Verify request body:", verifyBody);
    console.log("Verifying OTP with Sandbox API:", {
      reference_id: String(reference_id),
      otp: String(otp),
      headers: verifyHeaders,
    });

    const verifyResponse = await axios.post(
      "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify",
      verifyBody,
      { headers: verifyHeaders },
    );

    console.log("Sandbox Verify Response:", verifyResponse.data);

    if (verifyResponse.data && verifyResponse.data.code === 200) {
      const aadhaarData = verifyResponse.data.data;

      // Extract address from response
      const addressData = {
        houseNo: aadhaarData?.address?.house || "",
        street: aadhaarData?.address?.street || "",
        landmark: aadhaarData?.address?.landmark || "",
        city: aadhaarData?.address?.city || "",
        district: aadhaarData?.address?.district || "",
        state: aadhaarData?.address?.state || "",
        country: aadhaarData?.address?.country || "India",
        pinCode:
          aadhaarData?.address?.pincode || aadhaarData?.address?.zip || "",
        fetchedAt: new Date(),
      };

      // Update student record with fetched address
      const student = await Student.findByIdAndUpdate(
        (await Admission.findById(otpRecord.admissionId)).student,
        { aadhaarAddress: addressData },
        { new: true },
      );

      // Delete the used OTP record
      await AadhaarAddressOtp.deleteOne({ _id: otpRecord._id });

      return res.status(200).json({
        message: "Address fetched successfully",
        address: addressData,
        aadhaarName: aadhaarData?.name || "",
      });
    } else {
      return res.status(400).json({
        message: "Invalid OTP or OTP verification failed",
        error: verifyResponse.data?.message,
      });
    }
  } catch (error) {
    console.error(
      "Error verifying Aadhaar address OTP:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "An error occurred during verification. Please try again.",
      error: error.response?.data?.message || error.message,
    });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  allStudent,
  verifyOtp,
  addStudent,
  editStudent,
  deleteStudent,
  toggleStudentStatus,
  getStudentDetails,
  getStudentSessionState,
  sendAadhaarAddressOtp,
  verifyAadhaarAddressOtp,
  submitUndertaking,
  createLicenseRenewalOrder,
  handleLicenseRazorpayResponse,
};
