const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "lib",
  "skill-certificate-colored.pdf",
);

const TEMPLATE_PATH_NOBG = path.join(
  process.cwd(),
  "lib",
  "skill-certificate-nobg.pdf",
);

const ensureTemplateExists = () => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(
      "Skill certificate template not found at lib/skill-certificate-colored.pdf",
    );
  }
};

const ensureNoBgTemplateExists = () => {
  if (!fs.existsSync(TEMPLATE_PATH_NOBG)) {
    throw new Error(
      "Skill certificate template not found at lib/skill-certificate-nobg.pdf",
    );
  }
};

const getDocumentForMode = async (mode) => {
  if (mode === "preview") {
    ensureNoBgTemplateExists();
    const noBgTemplateBytes = fs.readFileSync(TEMPLATE_PATH_NOBG);
    const pdfDoc = await PDFDocument.load(noBgTemplateBytes);
    const page = pdfDoc.getPages()[0];
    return { pdfDoc, page };
  }

  ensureTemplateExists();
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  return { pdfDoc, page };
};

async function renderSkillCertificate(applicationData, mode = "print") {
  const { pdfDoc, page } = await getDocumentForMode(mode);
  const valueFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const {
    serialNumber,
    dateOfIssue,
    studentName,
    enrollmentNo,
    course,
    streamName,
    sessionName,
    durationMonths,
  } = applicationData;

  const studentDisplayName = enrollmentNo
    ? `${studentName || "N/A"} (${enrollmentNo})`
    : studentName || "N/A";

  const drawValue = (value, x, y, size = 11) => {
    page.drawText(String(value || "N/A"), {
      x,
      y,
      font: valueFont,
      size,
      color: rgb(0, 0, 0),
    });
  };

  drawValue(serialNumber, 102, 770, 11);
  drawValue(dateOfIssue, 470, 770, 11);
  drawValue(
    studentDisplayName,
    248,
    440,
    String(studentDisplayName || "").length > 52 ? 10 : 11,
  );
  drawValue(course, 265, 392, String(course || "").length > 52 ? 11 : 13);
  drawValue(streamName, 205, 350, 13);
  drawValue(sessionName, 420, 307, 13);
  drawValue(`${durationMonths || 0} Months`, 205, 262, 13);

  return pdfDoc.save();
}

async function previewSkillCertificate(applicationData) {
  return renderSkillCertificate(applicationData, "preview");
}

async function printSkillCertificate(applicationData) {
  return renderSkillCertificate(applicationData, "print");
}

module.exports = {
  previewSkillCertificate,
  printSkillCertificate,
};
