const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const pdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === "application/pdf" && ext === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const rawUploadPDF = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  const allowedExt = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPG, PNG, JPEG) are allowed!"), false);
  }
};

const rawUploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const rawUploadSignature = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 200 * 1024 },
});

const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const readFileHeader = async (filePath, bytesToRead = 8) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const header = Buffer.alloc(bytesToRead);
    await handle.read(header, 0, bytesToRead, 0);
    return header;
  } finally {
    await handle.close();
  }
};

const isJpegSignature = (header) =>
  header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;

const collectUploadedFiles = (req) => {
  const files = [];

  if (req.file) {
    files.push(req.file);
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    Object.values(req.files).forEach((group) => {
      if (Array.isArray(group)) {
        files.push(...group);
      }
    });
  }

  return files;
};

const cleanupFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    // Ignore cleanup failures to preserve original validation error.
  }
};

const validateSignature = async (file, expectedKind) => {
  const header = await readFileHeader(file.path);
  if (expectedKind === "pdf") {
    return header.subarray(0, 4).equals(PDF_SIGNATURE);
  }

  if (expectedKind === "image") {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".png") {
      return header.equals(PNG_SIGNATURE);
    }
    return isJpegSignature(header);
  }

  return false;
};

const validateUploadedSignatures = async (req, expectedKind) => {
  const uploadedFiles = collectUploadedFiles(req);
  for (const file of uploadedFiles) {
    const valid = await validateSignature(file, expectedKind);
    if (!valid) {
      await cleanupFile(file.path);
      throw new Error(
        "Uploaded file content does not match declared file type",
      );
    }
  }
};

const withSignatureValidation = (upload, expectedKind) => {
  const run = (handler) => (req, res, next) => {
    handler(req, res, async (err) => {
      if (err) return next(err);
      try {
        await validateUploadedSignatures(req, expectedKind);
        return next();
      } catch (validationError) {
        return next(validationError);
      }
    });
  };

  return {
    single: (fieldName) => run(upload.single(fieldName)),
    array: (fieldName, maxCount) => run(upload.array(fieldName, maxCount)),
    fields: (fieldConfig) => run(upload.fields(fieldConfig)),
    any: () => run(upload.any()),
    none: () => run(upload.none()),
  };
};

const uploadPDF = withSignatureValidation(rawUploadPDF, "pdf");
const uploadImage = withSignatureValidation(rawUploadImage, "image");
const uploadSignature = withSignatureValidation(rawUploadSignature, "image");

module.exports = { uploadPDF, uploadImage, uploadSignature };
