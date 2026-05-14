const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const fontPath = path.join(__dirname, "fonts", "Nimbus Roman.ttf");
const fontData = fs.readFileSync(fontPath).toString("base64");

// Grade calculation function (moved to top)
function getGrade(marks) {
  if (!marks && marks !== 0) return "";
  const numericMarks = Number(marks);
  if (isNaN(numericMarks)) return "";

  if (numericMarks >= 90) return "A+";
  if (numericMarks >= 80) return "A";
  if (numericMarks >= 70) return "B+";
  if (numericMarks >= 60) return "B";
  if (numericMarks >= 50) return "C+";
  if (numericMarks >= 40) return "C";
  return "F";
}

// Font face style with correct font name
const fontFaceStyle = `
  <style>
    @font-face {
      font-family: 'Nimbus Roman';
      src: url(data:font/truetype;charset=utf-8;base64,${fontData}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    body {
      font-family: 'Nimbus Roman', serif;
    }
    .marks-table {
      height: 450px;
      table-layout: fixed;
    }
    .marks-table thead {
      height: 30px;
    }
    .marks-table tbody {
      display: block;
      height: 400px;
      overflow: hidden;
    }
    .marks-table tr {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .long-text {
      word-break: break-word;
      line-height: 1.4;
    }
  </style>
`;

// Helper functions
function getTotal(mark, name) {
  if (!mark || !Array.isArray(mark)) return 0;
  
  return mark.reduce((total, item) => {
    if (!item) return total;
    
    if (name === "marksObtained") {
      const marks = Number(item.marksObtained);
      return total + (isNaN(marks) ? 0 : marks);
    } else if (name === "maxMarks") {
      const maxMarks = Number(item.subjectId?.maxMarks);
      return total + (isNaN(maxMarks) ? 0 : maxMarks);
    } else if (name === "credits") {
      const credits = Number(item.subjectId?.credits);
      return total + (isNaN(credits) ? 0 : credits);
    }
    return total;
  }, 0);
}

function getOrdinalSuffix(n) {
  if (!n && n !== 0) return "";
  const num = Number(n);
  if (isNaN(num)) return "";

  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${num}<sup>${suffix}</sup>`;
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = d.toLocaleString("default", { month: "long" });
  const day = d.getDate();

  const getOrdinalSuffix = (n) => {
    if (n >= 11 && n <= 13) return "ᵗʰ";
    const lastDigit = n % 10;
    switch (lastDigit) {
      case 1: return "ˢᵗ";
      case 2: return "ⁿᵈ";
      case 3: return "ʳᵈ";
      default: return "ᵗʰ";
    }
  };

  const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;
  return `${dayWithSuffix} ${month}, ${year}`;
}

function formatDateExamination(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = d.toLocaleString("default", { month: "long" });
  return `${month} ${year}`;
}

function normalizeMarksLength(marks, targetRowCount = 20) {
  if (!marks || !Array.isArray(marks)) {
    return Array(targetRowCount).fill({
      marksObtained: "",
      subjectId: {
        name: "",
        code: "",
        maxMarks: "",
        credits: "",
        grade: ""
      }
    });
  }

  // Filter out invalid entries and create clean copy
  const validMarks = marks
    .filter(mark => mark && mark.subjectId && mark.subjectId.name)
    .map(mark => ({
      marksObtained: mark.marksObtained || "",
      subjectId: {
        name: mark.subjectId.name || "",
        code: mark.subjectId.code || "",
        maxMarks: mark.subjectId.maxMarks || "",
        credits: mark.subjectId.credits || "",
        grade: mark.subjectId.grade || ""
      }
    }));

  // Calculate empty rows needed
  const emptyRowsNeeded = Math.max(0, targetRowCount - validMarks.length);

  // Add empty rows if needed
  const emptyRow = {
    marksObtained: "",
    subjectId: {
      name: "",
      code: "",
      maxMarks: "",
      credits: "",
      grade: ""
    }
  };

  return [...validMarks, ...Array(emptyRowsNeeded).fill(emptyRow)]
    .slice(0, targetRowCount); // Ensure we don't exceed target
}

async function generateQRCode(content) {
  try {
    return await QRCode.toDataURL(content);
  } catch (error) {
    console.error('QR Code generation failed:', error);
    return '';
  }
}

async function downResult(student) {
  try {
    // Input validation
    if (!student || typeof student !== "object") {
      throw new Error("Invalid student data");
    }

    const qrContent = `https://mobile.sgtu.ac.in/verify/${student._id || ""}`; 
    const qrCodeDataUrl = await generateQRCode(qrContent);
    
    const courseName = !student.course?.hasStream
      ? student.course?.name || ""
      : `${student.course?.name || ""} (${student.stream?.name || ""})`;
    
    const newSubjects = normalizeMarksLength(student.marks);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Student Result</title>
        <script src="https://cdn.tailwindcss.com"></script>
        ${fontFaceStyle}
      </head>
      <body style="font-family: 'Nimbus Roman', serif;" class="font-mono p-4 px-16 mt-24">
        <div class="relative container mx-auto">
          <div class="absolute text-xl right-1 -top-4 font-bold">S.No.: ${student.serialNumber || ""}</div>
          <h1 class="text-lg uppercase text-center font-extrabold mt-20">Statement of grades</h1>
          <h1 class="text-md font-extrabold uppercase text-center -mt-1">${courseName}</h1>

          <div class="flex justify-between mt-4 text-sm">
            <div class="flex">
              <div>
                <p class="font-bold">Student's Name</p>
                <p class="font-bold">Father's Name</p>
                <p class="font-bold capitalize">${student.course?.duration?.format || ""}</p>
              </div>
              <div>
                <p class="px-2 pl-4 font-bold">:</p>
                <p class="px-2 pl-4 font-bold">:</p>
                <p class="px-2 pl-4 font-bold">:</p>
              </div>
              <div>
                <p class="uppercase">${student.student?.name || ""}</p>
                <p class="uppercase">${student.student?.fatherName || ""}</p>
                <p class="">${getOrdinalSuffix(student.semester)} ${student.course?.duration?.format || ""}</p>
              </div>
            </div>
            <div class="flex">
              <div>
                <p class="font-bold">Enrollment No.</p>
                <p class="font-bold">Examination</p>
                <p class="font-bold">Date of Declaration</p>
              </div>
              <div>
                <p class="px-2 font-bold">:</p>
                <p class="px-2 font-bold">:</p>
                <p class="px-2 font-bold">:</p>
              </div>
              <div>
                <p class="">${student.student?.enrollmentNumber || ""}</p>
                <p class="">${formatDateExamination(student.examinationDate)}</p>
                <p class="">${formatDate(student.dateOfDeclare)}</p>
              </div>
            </div>
          </div>

          <table class="w-full border border-black marks-table">
            <colgroup>
              <col style="width: 13%">
              <col style="width: 48%">
              <col style="width: 9%">
              <col style="width: 9%">
              <col style="width: 8%">
              <col style="width: 7%">
            </colgroup>
            
            <thead>
              <tr>
                <th class="border border-black text-xs p-1">Subject Code</th>
                <th class="border border-black text-xs p-1">Subject Name</th>
                <th class="border border-black text-xs p-1">Max. Marks</th>
                <th class="border border-black text-xs p-1">Marks Obtained</th>
                <th class="border border-black text-xs p-1">Subject Credits</th>
                <th class="border border-black text-xs p-1">Grade</th>
              </tr>
            </thead>
            
            <tbody>
              ${newSubjects.map((mark, index) => `
                <tr class="text-left text-[12px] ${index % 2 === 0 ? 'bg-gray-50' : ''}">
                  <td class="border border-black p-1 align-top">${mark.subjectId?.code || ""}</td>
                  <td class="border border-black p-1 align-top uppercase long-text">
                    ${mark.subjectId?.name || ""}
                  </td>
                  <td class="border border-black p-1 text-center">${mark.subjectId?.maxMarks || ""}</td>
                  <td class="border border-black p-1 text-center">${mark.marksObtained || ""}</td>
                  <td class="border border-black p-1 text-center">${mark.subjectId?.credits || ""}</td>
                  <td class="border border-black p-1 text-center">
                    ${mark.subjectId?.name ? getGrade(mark.marksObtained) : ""}
                  </td>
                </tr>
              `).join("")}
              
              <tr style="height: 30px;">
                <td class="border-t border-black"></td>
                <td class="border-t border-r border-black p-1 text-right font-bold">Total</td>
                <td class="border-t border-r border-black p-1 text-center font-bold">${getTotal(student.marks, "maxMarks")}</td>
                <td class="border-t border-r border-black p-1 text-center font-bold">${getTotal(student.marks, "marksObtained")}</td>
                <td class="border-t border-r border-black p-1 text-center font-bold">${getTotal(student.marks, "credits")}</td>
                <td class="border-t border-black p-1 text-center font-bold">-</td>
              </tr>
            </tbody>
          </table>

          <div class="mt-4 font-thin">
            <div class="flex text-sm">
              <div class="-mt-2">
                <p class="">Date</p>
                <p class="-mt-2">Place</p> 
              </div>
              <div class="-mt-2">      
                <p class="px-2">:</p>
                <p class="px-2 -mt-2">:</p>
              </div>
              <div class="-mt-2">      
                <p class="">${formatDate(student.dateOfIssue)}</p>
                <p class="-mt-2">Namchi, Sikkim</p>
              </div>
            </div>
            <div class="flex justify-between font-bold mt-16">
              <div>Prepared By</div>
              <div class="relative ml-24">
                <div class="absolute -top-24 -z-10">
                  <img src="${qrCodeDataUrl}" alt="QR Code" class="w-16 h-16" />
                </div>
                Verified By
              </div>
              <div>Controller of Examinations</div>
            </div>
            <p class="text-base font-light">NOTE:<span class="text-xs tracking-wide font-light"> For details in respect of grade abbreviations, grades, calculation of SGPA AND CGPA, please see overleaf</span></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfPath = path.join(__dirname, `${student.student?.name || 'result'}_result.pdf`);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: '20mm',
        right: '10mm',
        bottom: '20mm',
        left: '10mm'
      }
    });

    await browser.close();
    return pdfPath;

  } catch (error) {
    console.error("Error generating result PDF:", error);
    throw error;
  }
}

module.exports = { downResult };