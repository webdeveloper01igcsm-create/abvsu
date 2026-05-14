const IDCard = require("../models/IDCard");
const Admission = require("../models/Admission");
const Student = require("../models/Student");
const { z } = require("zod");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const { generateIDCardPDF } = require("../utils/idCardPdf");

// Validation schema for ID card
const idCardSchema = z.object({
  admission: z.string().length(24, "Invalid admission ID"),
  photo: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z
    .object({
      name: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  validTill: z.string().min(1, "Valid till date is required"),
});

// Generate single ID card
const generateIDCard = async (req, res) => {
  try {
    let { admission, bloodGroup, address, emergencyContact, validTill } =
      req.body;
    const { id: adminId } = req.user;

    // Get photo from uploaded file or existing URL
    let photo = req.body.photo || null;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    // Parse emergencyContact if it's a string (from FormData)
    if (typeof emergencyContact === "string") {
      try {
        emergencyContact = JSON.parse(emergencyContact);
      } catch (e) {
        emergencyContact = null;
      }
    }

    // Validate input (photo is now optional in body since it can come from file)
    const validationData = {
      admission,
      bloodGroup,
      address,
      emergencyContact,
      validTill,
    };
    idCardSchema.parse({ ...validationData, photo });

    // Check if admission exists
    const admissionData = await Admission.findById(admission)
      .populate("student", "name fatherName email mobileNumber dateOfBirth")
      .populate("course", "name")
      .populate("stream", "name")
      .populate("session", "session");

    if (!admissionData) {
      return res
        .status(404)
        .json({ success: false, message: "Admission not found" });
    }

    // Generate card number
    const cardNumber = `SGTU${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Check if ID card already exists
    let idCard = await IDCard.findOne({ admission });

    if (idCard) {
      // Update existing ID card
      idCard.photo = photo || idCard.photo;
      idCard.bloodGroup = bloodGroup || idCard.bloodGroup;
      idCard.address = address || idCard.address;
      idCard.emergencyContact = emergencyContact || idCard.emergencyContact;
      idCard.validTill = new Date(validTill);
      idCard.generatedBy = adminId;
      idCard.generatedAt = Date.now();
      await idCard.save();
    } else {
      // Create new ID card
      idCard = new IDCard({
        admission,
        photo,
        bloodGroup,
        address,
        emergencyContact,
        validTill: new Date(validTill),
        cardNumber,
        generatedBy: adminId,
      });
      await idCard.save();
    }

    const populatedCard = await IDCard.findById(idCard._id).populate({
      path: "admission",
      populate: [
        {
          path: "student",
          select: "name fatherName email mobileNumber dateOfBirth",
        },
        { path: "course", select: "name" },
        { path: "stream", select: "name" },
        { path: "session", select: "session" },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "ID Card generated successfully",
      idCard: populatedCard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors,
      });
    }
    console.error("Error generating ID card:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Bulk generate ID cards from CSV
const bulkGenerateIDCards = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const results = {
      success: [],
      failed: [],
    };

    for (const row of data) {
      try {
        const {
          enrollmentNumber,
          bloodGroup,
          address,
          emergencyContactName,
          emergencyContactPhone,
          validTill,
        } = row;

        if (!enrollmentNumber || !validTill) {
          results.failed.push({ row, reason: "Missing required fields" });
          continue;
        }

        // Find admission
        const admission = await Admission.findOne({ enrollmentNumber });
        if (!admission) {
          results.failed.push({ row, reason: "Admission not found" });
          continue;
        }

        // Generate card number
        const cardNumber = `SGTU${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Check if ID card already exists
        let idCard = await IDCard.findOne({ admission: admission._id });

        if (idCard) {
          // Update existing
          idCard.bloodGroup = bloodGroup || idCard.bloodGroup;
          idCard.address = address || idCard.address;
          idCard.emergencyContact = {
            name: emergencyContactName || idCard.emergencyContact?.name,
            phone: emergencyContactPhone || idCard.emergencyContact?.phone,
          };
          idCard.validTill = new Date(validTill);
          idCard.generatedBy = adminId;
          idCard.generatedAt = Date.now();
          await idCard.save();
        } else {
          // Create new
          idCard = new IDCard({
            admission: admission._id,
            bloodGroup,
            address,
            emergencyContact: {
              name: emergencyContactName,
              phone: emergencyContactPhone,
            },
            validTill: new Date(validTill),
            cardNumber,
            generatedBy: adminId,
          });
          await idCard.save();
        }

        results.success.push({
          enrollmentNumber,
          cardNumber: idCard.cardNumber,
        });
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      message: "Bulk generation completed",
      results,
    });
  } catch (error) {
    console.error("Error in bulk generation:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Get all ID cards (Admin)
const getAllIDCards = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    let query = {};
    if (search) {
      const admissions = await Admission.find({
        enrollmentNumber: new RegExp(search, "i"),
      });
      const admissionIds = admissions.map((a) => a._id);
      query.admission = { $in: admissionIds };
    }

    const idCards = await IDCard.find(query)
      .populate({
        path: "admission",
        populate: [
          { path: "student", select: "name fatherName email mobileNumber" },
          { path: "course", select: "name" },
          { path: "stream", select: "name" },
        ],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ generatedAt: -1 });

    const count = await IDCard.countDocuments(query);

    return res.status(200).json({
      success: true,
      idCards,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error("Error fetching ID cards:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Get single ID card (Student)
const getStudentIDCard = async (req, res) => {
  try {
    const { id: admissionId } = req.user;

    const idCard = await IDCard.findOne({
      admission: admissionId,
      isVisible: true,
    }).populate({
      path: "admission",
      populate: [
        {
          path: "student",
          select:
            "name fatherName motherName email mobileNumber dateOfBirth gender aadharNumber",
        },
        { path: "course", select: "name" },
        { path: "stream", select: "name" },
        { path: "session", select: "session" },
      ],
    });

    if (!idCard) {
      return res
        .status(404)
        .json({ success: false, message: "ID Card not found or not visible" });
    }

    return res.status(200).json({ success: true, idCard });
  } catch (error) {
    console.error("Error fetching student ID card:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Toggle visibility
const toggleVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;

    const idCard = await IDCard.findByIdAndUpdate(
      id,
      { isVisible },
      { new: true },
    ).populate({
      path: "admission",
      populate: [{ path: "student", select: "name" }],
    });

    if (!idCard) {
      return res
        .status(404)
        .json({ success: false, message: "ID Card not found" });
    }

    return res.status(200).json({
      success: true,
      message: `ID Card ${isVisible ? "made visible" : "hidden"}`,
      idCard,
    });
  } catch (error) {
    console.error("Error toggling visibility:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Delete ID card
const deleteIDCard = async (req, res) => {
  try {
    const { id } = req.params;

    const idCard = await IDCard.findByIdAndDelete(id);

    if (!idCard) {
      return res
        .status(404)
        .json({ success: false, message: "ID Card not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "ID Card deleted successfully" });
  } catch (error) {
    console.error("Error deleting ID card:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Download ID card as PDF
const downloadIDCard = async (req, res) => {
  try {
    const { id: admissionId } = req.user;

    const idCard = await IDCard.findOne({
      admission: admissionId,
      isVisible: true,
    }).populate({
      path: "admission",
      populate: [
        {
          path: "student",
          select:
            "name fatherName motherName email mobileNumber dateOfBirth gender",
        },
        { path: "course", select: "name" },
        { path: "stream", select: "name" },
        { path: "session", select: "session" },
      ],
    });

    if (!idCard) {
      return res
        .status(404)
        .json({ success: false, message: "ID Card not found or not visible" });
    }

    // Generate PDF
    const pdfBuffer = await generateIDCardPDF(idCard);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ID_Card_${idCard.cardNumber}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error downloading ID card:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Download ID card as PDF (Admin)
const downloadIDCardAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const idCard = await IDCard.findById(id).populate({
      path: "admission",
      populate: [
        {
          path: "student",
          select:
            "name fatherName motherName email mobileNumber dateOfBirth gender",
        },
        { path: "course", select: "name" },
        { path: "stream", select: "name" },
        { path: "session", select: "session" },
      ],
    });

    if (!idCard) {
      return res
        .status(404)
        .json({ success: false, message: "ID Card not found" });
    }

    // Generate PDF
    const pdfBuffer = await generateIDCardPDF(idCard);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ID_Card_${idCard.cardNumber}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error downloading ID card:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  generateIDCard,
  bulkGenerateIDCards,
  getAllIDCards,
  getStudentIDCard,
  toggleVisibility,
  deleteIDCard,
  downloadIDCard,
  downloadIDCardAdmin,
};
