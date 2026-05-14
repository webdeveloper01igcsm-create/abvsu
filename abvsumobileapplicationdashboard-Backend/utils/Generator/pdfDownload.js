const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const fs = require("fs");
const path = require("path");

// --- FUNCTION FOR PROVISIONAL CERTIFICATE ---
async function downProvisionalCertificate(applicationData) {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "DOWN PROVISIONAL CERTIFICATE all.pdf"
  );
  const existingPdfBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // Load custom fonts for Provisional Certificate
  const arialBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Arial.ttf")
  );
  const calibriBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Calibri.ttf")
  );
  const calibriBoldBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Calibri-Bold.ttf")
  );
  const monotypeCorsivaBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Monotype-Corsiva-Italic.ttf")
  );

  const arialFont = await pdfDoc.embedFont(arialBytes, { subset: true });
  const calibriFont = await pdfDoc.embedFont(calibriBytes, { subset: true });
  const calibriBoldFont = await pdfDoc.embedFont(calibriBoldBytes, {
    subset: true,
  });
  const monotypeCorsivaFont = await pdfDoc.embedFont(monotypeCorsivaBytes, {
    subset: true,
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const {
    serialNumber,
    studentName,
    enrollmentNo,
    course,
    streamName,
    cgpa,
    academicSession,
    dateOfIssue,
  } = applicationData;

  const fullCourseName = streamName ? `${course} (${streamName})` : course;
  const studentInfoText = `${studentName} (${enrollmentNo})`;
  const sgpaAndYearText = `with CGPA (${cgpa}) in the year of ${academicSession}.`;

  // Calculate widths with correct fonts and sizes
  const studentInfoWidth = calibriFont.widthOfTextAtSize(studentInfoText, 12);
  const courseNameWidth = calibriBoldFont.widthOfTextAtSize(fullCourseName, 14);
  const sgpaAndYearWidth = monotypeCorsivaFont.widthOfTextAtSize(
    sgpaAndYearText,
    16
  );

  const positions = {
    srNo: { x: 76, y: height - 113 },
    studentInfo: { x: (width - studentInfoWidth) / 2, y: height - 172 },
    courseName: { x: (width - courseNameWidth) / 2, y: height - 270 },
    sgpaAndYear: { x: (width - sgpaAndYearWidth) / 2, y: height - 290 },
    date: { x: 495, y: height - 113 },
  };

  // Draw text with specified fonts and sizes
  page.drawText(serialNumber.toString().slice(-10), {
    x: positions.srNo.x,
    y: positions.srNo.y,
    font: arialFont,
    size: 10,
    color: rgb(0, 0, 0),
  });
  page.drawText(studentInfoText, {
    x: positions.studentInfo.x,
    y: positions.studentInfo.y,
    font: calibriFont,
    size: 12,
    color: rgb(0, 0, 0),
  });
  page.drawText(fullCourseName, {
    x: positions.courseName.x,
    y: positions.courseName.y,
    font: calibriBoldFont,
    size: 14,
    color: rgb(0, 0, 0),
  });
  page.drawText(sgpaAndYearText, {
    x: positions.sgpaAndYear.x,
    y: positions.sgpaAndYear.y,
    font: monotypeCorsivaFont,
    size: 16,
    color: rgb(0, 0, 0),
  });
  page.drawText(dateOfIssue, {
    x: positions.date.x,
    y: positions.date.y,
    font: arialFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// --- FUNCTION FOR COURSE COMPLETION CERTIFICATE ---
async function downCourseCompletionCertificate(applicationData) {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "down coursecompletetioncertificate.pdf"
  );
  const existingPdfBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const cinzelBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Cinzel-SemiBold.ttf")
  );
  const goudyBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/GoudyOldStyle.ttf")
  );
  const goudyRegularBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Goudy Old Style Regular.ttf")
  );

  // Add { subset: true } to fix potential rendering issues
  const cinzelFont = await pdfDoc.embedFont(cinzelBytes, { subset: true });
  const goudyFont = await pdfDoc.embedFont(goudyBytes, { subset: true });
  const goudyRegularFont = await pdfDoc.embedFont(goudyRegularBytes, {
    subset: true,
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const {
    serialNumber,
    studentName,
    enrollmentNo,
    course,
    streamName,
    academicSession,
    dateOfIssue,
  } = applicationData;

  // const studentNameWidth = cinzelFont.widthOfTextAtSize(studentName, 30);
  const studentNameWidth = studentName.length > 22 ? cinzelFont.widthOfTextAtSize(studentName, 24) : cinzelFont.widthOfTextAtSize(studentName, 30);
  const courseWidth = cinzelFont.widthOfTextAtSize(course, 20);
  const streamNameWidth = cinzelFont.widthOfTextAtSize(streamName, 33);
  const sessionText = `AUGUST, ${academicSession.toString()}`;

  const positions = {
    studentName: { x: (width - studentNameWidth) / 2, y: height - 475 },
    enrollmentNo: { x: 293, y: height - 514 },
    course: { x: (width - courseWidth) / 2, y: height - 550 },
    streamName: { x: (width - streamNameWidth) / 2, y: height - 600 },
    academicSession: { x: 292, y: height - 701 },
    dateOfIssue: { x: 120, y: height - 789.5 },
    srNo: { x: 490, y: height - 788.5 },
  };

  page.drawText(studentName, {
    x: positions.studentName.x,
    y: positions.studentName.y,
    font: cinzelFont,
    size: studentName.length > 22 ? 24 : 30,
    color: rgb(0, 0, 0),
  });
  page.drawText(enrollmentNo, {
    x: positions.enrollmentNo.x,
    y: positions.enrollmentNo.y,
    font: goudyFont,
    size: 15,
    color: rgb(0, 0, 0),
  });
  page.drawText(course, {
    x: positions.course.x,
    y: positions.course.y,
    font: cinzelFont,
    size: 20,
    color: rgb(0, 0, 0),
  });
  page.drawText(streamName, {
    x: positions.streamName.x,
    y: positions.streamName.y,
    font: cinzelFont,
    size: 33,
    color: rgb(0, 0, 0),
  });
  page.drawText(sessionText, {
    x: positions.academicSession.x,
    y: positions.academicSession.y,
    font: cinzelFont,
    size: 11.9,
    color: rgb(0, 0, 0),
  });
  page.drawText(dateOfIssue, {
    x: positions.dateOfIssue.x,
    y: positions.dateOfIssue.y,
    font: goudyRegularFont,
    size: 9.5,
    color: rgb(0, 0, 0),
  });
  page.drawText(serialNumber, {
    x: positions.srNo.x,
    y: positions.srNo.y,
    font: goudyRegularFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// --- FUNCTION FOR MIGRATION CERTIFICATE ---
async function downMigrationCertificate(applicationData) {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "migrationCertificate.pdf"
  ); // Placeholder template
  const existingPdfBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // Load custom fonts (reusing existing ones for now)
  const goudyOldStyle = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/GoudyOldStyle.ttf")
  );

  const goudyOldStyleFont = await pdfDoc.embedFont(goudyOldStyle, {
    subset: true,
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const {
    serialNumber,
    studentName,
    enrollmentNo,
    course,
    streamName,
    guardianName,
  } = applicationData;

  const studentInfoText = studentName;
  const enrollmentInfoText = enrollmentNo;
  const courseInfoText = `${course} ${streamName}`;
  const guardianInfoText = `Guardian Name: ${guardianName}`;
  const dateOfIssueText = `${dateOfIssue}`;

  // Calculate widths
  // const studentInfoWidth = goudyOldStyleFont.widthOfTextAtSize(studentInfoText, 17);
  // const enrollmentInfoWidth = goudyOldStyleFont.widthOfTextAtSize(enrollmentInfoText, 17);
  // const courseInfoWidth = goudyOldStyleFont.widthOfTextAtSize(courseInfoText, 17);
  // const guardianInfoWidth = goudyOldStyleFont.widthOfTextAtSize(guardianInfoText, 17);
  // const dateOfIssueWidth = goudyOldStyleFont.widthOfTextAtSize(dateOfIssueText, 14);

  const positions = {
    studentInfo: { x: 255, y: height - 210 },
    enrollmentInfo: { x: 255, y: height - 285 },
    guardianInfo: { x: 255, y: height - 249 },
    courseInfo: { x: 255, y: height - 322 },
    dateOfIssue: { x: 150, y: height - 541 },
    srNo: { x: 685, y: height - 541 }, // Reusing provisional cert position
  };

  page.drawText(serialNumber, {
    x: positions.srNo.x,
    y: positions.srNo.y,
    font: goudyOldStyleFont,
    size: 14,
    color: rgb(0, 0, 0),
  });
  page.drawText(studentInfoText, {
    x: positions.studentInfo.x,
    y: positions.studentInfo.y,
    font: goudyOldStyleFont,
    size: 17,
    color: rgb(0, 0, 0),
  });
  page.drawText(courseInfoText, {
    x: positions.courseInfo.x,
    y: positions.courseInfo.y,
    font: goudyOldStyleFont,
    size: 17,
    color: rgb(0, 0, 0),
  });
  page.drawText(dateOfIssueText, {
    x: positions.dateOfIssue.x,
    y: positions.dateOfIssue.y,
    font: goudyOldStyleFont,
    size: 14,
    color: rgb(0, 0, 0),
  });
  page.drawText(guardianInfoText, {
    x: positions.guardianInfo.x,
    y: positions.guardianInfo.y,
    font: goudyOldStyleFont,
    size: 17,
    color: rgb(0, 0, 0),
  });
  page.drawText(enrollmentInfoText, {
    x: positions.enrollmentInfo.x,
    y: positions.enrollmentInfo.y,
    font: goudyOldStyleFont,
    size: 17,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// --- FUNCTION FOR SECOND DEGREE CERTIFICATE ---
async function downSecondDegreeCertificate(applicationData) {
  const templatePath = path.join(process.cwd(), "lib", "DegreeCertificate.pdf"); // Placeholder template
  const existingPdfBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // Load custom fonts (reusing existing ones for now)
  const cinzelBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/Cinzel-SemiBold.ttf")
  );
  const goudyBytes = fs.readFileSync(
    path.join(process.cwd(), "lib/fonts/GoudyOldStyle.ttf")
  );

  // Add { subset: true } to fix potential rendering issues
  const cinzelFont = await pdfDoc.embedFont(cinzelBytes, { subset: true });
  const goudyFont = await pdfDoc.embedFont(goudyBytes, { subset: true });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const {
    serialNumber,
    studentName,
    enrollmentNo,
    course,
    streamName,
    academicSession,
    dateOfIssue,
  } = applicationData;

  const courseInfoText = `${course} ${streamName}`;

  const studentNameWidth = cinzelFont.widthOfTextAtSize(studentName, 30);
  const courseWidth = cinzelFont.widthOfTextAtSize(courseInfoText, 20);
  // const streamNameWidth = cinzelFont.widthOfTextAtSize(streamName, 33);
  const sessionText = academicSession;

  const positions = {
    studentName: { x: (width - studentNameWidth) / 2, y: height - 395 },
    enrollmentNo: { x: 297, y: height - 435 },
    course: { x: (width - courseWidth) / 2, y: height - 535 },
    // streamName:      { x: (width - streamNameWidth) / 2, y: height - 600 },
    academicSession: { x: 340, y: height - 649 },
    dateOfIssue: { x: 120, y: height - 790 },
    srNo: { x: 475, y: height - 790 },
  };

  page.drawText(studentName, {
    x: positions.studentName.x,
    y: positions.studentName.y,
    font: cinzelFont,
    size: 30,
    color: rgb(0, 0, 0),
  });
  page.drawText(enrollmentNo, {
    x: positions.enrollmentNo.x,
    y: positions.enrollmentNo.y,
    font: goudyFont,
    size: 12,
    color: rgb(0, 0, 0),
  });
  page.drawText(courseInfoText, {
    x: positions.course.x,
    y: positions.course.y,
    font: cinzelFont,
    size: 20,
    color: rgb(0, 0, 0),
  });
  page.drawText(sessionText, {
    x: positions.academicSession.x,
    y: positions.academicSession.y,
    font: goudyFont,
    size: 14,
    color: rgb(0, 0, 0),
  });
  page.drawText(dateOfIssue, {
    x: positions.dateOfIssue.x,
    y: positions.dateOfIssue.y,
    font: goudyFont,
    size: 10,
    color: rgb(0, 0, 0),
  });
  page.drawText(serialNumber, {
    x: positions.srNo.x,
    y: positions.srNo.y,
    font: goudyFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = {
  downProvisionalCertificate,
  downCourseCompletionCertificate,
  downMigrationCertificate,
  downSecondDegreeCertificate,
};
