const fs = require("fs");
const path = require("path");

const jsonError = (res, status, message) => {
  return res.status(status).json({ success: false, message });
};

const sanitizePdfFilename = (input, fallback = "document") => {
  const raw = String(input || "").trim();
  const safeBase = raw
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = safeBase || fallback;
  return fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
};

const resolveUploadsFilePath = (fileUrl) => {
  const value = String(fileUrl || "").trim();
  if (!value.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = value.replace(/^\/+/, "");
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const absolutePath = path.resolve(process.cwd(), relativePath);

  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return absolutePath;
};

const streamInlinePdf = (res, filePath, fileName = "document.pdf") => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizePdfFilename(fileName)}"`,
  );
  res.sendFile(filePath);
  return true;
};

module.exports = {
  jsonError,
  sanitizePdfFilename,
  resolveUploadsFilePath,
  streamInlinePdf,
};
