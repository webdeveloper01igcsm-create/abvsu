const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const bgPath = path.join(__dirname, "abvsubg.jpeg");
const bgBase64 = fs.readFileSync(bgPath, { encoding: "base64" });
const bg = `data:image/jpeg;base64,${bgBase64}`;
// const bg = `data:image/jpeg;base64`;

const fontPath = path.join(__dirname, "fonts", "Nimbus Roman.ttf");
const fontData = fs.readFileSync(fontPath).toString("base64");

const fontFaceStyle = `
  <style>
    @font-face {
      font-family: 'Nimbux Roman';
      src: url(data:font/truetype;charset=utf-8;base64,${fontData}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    body {
      font-family: 'Nimbux Roman', serif;
}
  </style>
`;

const data = {
  _id: "680a1493aaef13edf63a8bdb",
  stream: {
    _id: "6800a1f23971a612a3f2a1c8",
    name: "Computer Application1",
    __v: 0,
  },
  course: {
    duration: {
      format: "Semester",
      value: 6,
      inYears: 3,
    },
    _id: "6802176789207b1e6075fbb2",
    name: "BCA",
    courseTypeId: "6802174f89207b1e6075fb21",
    hasStream: true,
    streams: ["6800a1f23971a612a3f2a1c8", "6800aecc3971a612a3f2acc8"],
    __v: 0,
  },
  semester: 1,
  student: {
    document: {
      aadhar: null,
      photo: null,
      pan: null,
      secondaryMarksheet: null,
      seniorSecondaryMarksheet: null,
      graduationMarksheet: null,
    },
    appRegisDetails: {
      date: null,
      status: false,
    },
    subscriptionDetails: {
      isActive: false,
      expiryDate: null,
    },
    _id: "680a12d0712a888bbd8f4c2e",
    name: "Bca 1",
    fatherName: "Fathera",
    enrollmentNumber: "776622772266",
    aadharNumber: 100000000065,
    mobileNumber: 9852534827,
    email: "test@gmail.com",
    session: "67ff5ae8f605977b51e40b8e",
    course: "6802176789207b1e6075fbb2",
    stream: "6800a1f23971a612a3f2a1c8",
    __v: 0,
  },
  __v: 0,
  createdAt: "2025-04-24T10:38:11.314Z",
  dateOfDeclare: "2025-04-10T18:30:00.000Z",
  dateOfIssue: "2025-04-07T18:30:00.000Z",
  examinationDate: "2025-04-22T18:30:00.000Z",
  marks: [
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "BCa 1",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "BCa 1",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    // {
    //   subjectId: {
    //     _id: "680a1366712a888bbd8f4e61",
    //     name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
    //     code: "BCA-01",
    //     isElective: false,
    //     maxMarks: 100,
    //     passingMarks: 33,
    //     __v: 0,
    //     credits: 4,
    //   },
    //   marksObtained: 78,
    //   _id: "680a1493c7d79e9e5c811ed5",
    // },
    {
      subjectId: {
        _id: "680a1366712a888bbd8f4e61",
        name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
        code: "BCA-01",
        isElective: false,
        maxMarks: 100,
        passingMarks: 33,
        __v: 0,
        credits: 4,
      },
      marksObtained: 78,
      _id: "680a1493c7d79e9e5c811ed5",
    },
    {
      subjectId: {
        _id: "680a1366712a888bbd8f4e61",
        name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
        code: "BCA-01",
        isElective: false,
        maxMarks: 100,
        passingMarks: 33,
        __v: 0,
        credits: 4,
      },
      marksObtained: 78,
      _id: "680a1493c7d79e9e5c811ed5",
    },

    {
      subjectId: {
        _id: "680a1366712a888bbd8f4e61",
        name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
        code: "BCA-01",
        isElective: false,
        maxMarks: 100,
        passingMarks: 33,
        __v: 0,
        credits: 4,
      },
      marksObtained: 78,
      _id: "680a1493c7d79e9e5c811ed5",
    },
    {
      subjectId: {
        _id: "680a1366712a888bbd8f4e61",
        name: "ASDFASDF ASDFASDF ASDFASDF ASDF ASDFASDF ASDF as",
        code: "BCA-01",
        isElective: false,
        maxMarks: 100,
        passingMarks: 33,
        __v: 0,
        credits: 4,
      },
      marksObtained: 78,
      _id: "680a1493c7d79e9e5c811ed5",
    },
  ],
  serialNumber: "100112398  ",
};

function getTotal(mark, name) {
  let total = 0;
  mark.map((item) => {
    if (name == "marksObtained") {
      total += Number(item.marksObtained);
      // console.log("item.marksObtained" + item.marksObtained, total);
    } else if (name === "maxMarks") {
      total += item.subjectId.maxMarks;
    } else if (name === "credits") {
      total += item.subjectId.credits;
    }
  });
  return total;
}

function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}<sup>${suffix}</sup>`;
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.toLocaleString("default", { month: "long" });
  const day = d.getDate();

  const getOrdinalSuffix = (n) => {
    if (n >= 11 && n <= 13) return "ᵗʰ";
    const lastDigit = n % 10;
    switch (lastDigit) {
      case 1:
        return "ˢᵗ";
      case 2:
        return "ⁿᵈ";
      case 3:
        return "ʳᵈ";
      default:
        return "ᵗʰ";
    }
  };

  const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;

  return `${dayWithSuffix} ${month}, ${year}`;
}

function formatDateExamination(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.toLocaleString("default", { month: "long" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month} ${year}`;
}

function getTenureLabel(course) {
  return course?.duration?.format === "Month"
    ? "Duration"
    : course?.duration?.format || "Semester";
}

function getTenureValue(student) {
  if (student.course?.duration?.format === "Month") {
    return `${student.course?.duration?.value || 0} Months`;
  }

  return `${getOrdinalSuffix(student.semester)} ${student.course.duration.format}`;
}

function getPerformanceLabel(student) {
  if (student.course?.duration?.format === "Month") {
    return "Course Performance";
  }

  return `Current ${student.course?.duration?.format || "Semester"} Performance`;
}

function normalizeMarksLength(entry, targetLength = 24) {
  const currentLength = entry.length;
  for (let index = 0; index < entry.length; index++) {
    const name = entry[index].subjectId.name.length;
    const code = entry[index].subjectId.code.length;
    if (name > 46 || code > 10) {
      targetLength--;
    } else {
      continue;
    }
  }
  if (currentLength < targetLength) {
    const blanksToAdd = targetLength - currentLength;
    for (let i = 0; i < blanksToAdd; i++) {
      entry.push({
        marksObtained: "",
        subjectId: {
          name: "",
          code: "",
          maxMarks: "",
          credits: "",
          grage: "",
        },
      });
    }
  }
  return entry;
}

// Function to generate result PDF
// async function generateResultPDFOld(student) {
//   const qrContent = `https://mobile.sgtu.ac.in/verify/${student._id}`;
//   const qrCodeDataUrl = await QRCode.toDataURL(qrContent);
//   const courseName = !student.course?.hasStream
//     ? student.course.name
//     : `${student.course.name} (${student.stream?.name})`;
//   const newSubjects = normalizeMarksLength(student.marks);
//   const htmlContent = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>Student Result</title>
//       <script src="https://cdn.tailwindcss.com"></script>
//       ${fontFaceStyle}
//     </head>
//     <body
//   class="font-mono border border-transparent"
//   style="font-family: 'Nimbux Roman', serif; background-image: url(${bg}); background-size: 794px 1123px; background-repeat: no-repeat; background-position: top left; width: 794px; height: 1123px;">

//       <div class="flex flex-col relative mx-auto h-[860px] px-16 pt-2 mt-48">
//         <div class="h-[620px]">
//         <div class="absolute text-xl right-16 -top-4 font-bold">S.No.:${
//           student.serialNumber
//         }</div>
//         <h1 class="text-lg uppercase text-center font-extrabold">Statement of grades</h1>
//         <h1 class="text-md font-extrabold uppercase text-center -mt-1">${courseName}</h1>
//         <div class="flex justify-between mt-4 text-sm">
//           <div class="flex">
//             <div>
//               <p class="font-bold">Student's Name</p>
//               <p class="font-bold">Father's Name</p>
//               <p class="font-bold capitalize">${
//                 student.course.duration.format
//               }</p>
//             </div>
//             <div>
//               <p class="px-2 pl-4 font-bold">:</p>
//               <p class="px-2 pl-4 font-bold">:</p>
//               <p class="px-2 pl-4 font-bold">:</p>
//             </div>
//             <div>
//                 <p class="uppercase">${student.admission.student.name}</p>
//                 <p class="uppercase">${student.admission.student.fatherName}</p>
//                 <p class="">${getOrdinalSuffix(student.semester)} ${
//     student.course.duration.format
//   }</p>
//             </div>
//           </div>
//           <div class="flex">
//             <div>
//               <p class="font-bold">Enrollment No.</p>
//               <p class="font-bold">Examination</p>
//               <p class="font-bold">Date of Declaration</p>
//             </div>
//             <div>
//                 <p class="px-2 font-bold">:</p>
//                 <p class="px-2 font-bold">:</p>
//                 <p class="px-2 font-bold">:</p>
//             </div>
//             <div>
//                 <p class="">${student.admission.enrollmentNumber}</p>
//                 <p class="">${formatDateExamination(
//                   student.examinationDate
//                 )}</p>
//                 <p class="">${formatDate(student.dateOfDeclare)}</p>
//             </div>
//           </div>
//         </div>

//         <table class="w-full border border-black mt-2">
//           <thead class="">
//             <tr class="border border-black font-bold">
//               <th class="border border-black text-xs p-0 m-0">Subject Code</th>
//               <th class="border border-black text-xs p-0 m-0">Subject Name</th>
//               <th class="border border-black text-xs p-0 m-0">Max. Marks</th>
//               <th class="border border-black text-xs p-0 m-0">Marks Obtained</th>
//               <th class="border border-black text-xs p-0 m-0">Subject Credits</th>
//               <th class="border border-black text-xs p-0 m-0">Grade</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${newSubjects
//               .map(
//                 (mark) => `
//               <tr class="text-left font-bold text-[12px] ${
//                 mark.subjectId.code === "" ? "h-4" : "h-2"
//               }">
//                 <td class="border-r border-black p-0 m-0 text-left pl-2 align-top" style="width: 13%">${
//                   mark.subjectId.code
//                 }</td>
//                 <td class="border-r border-black p-0 m-0 text-left px-1 uppercase" style="width: 48%">${
//                   mark.subjectId.name
//                 }</td>
//                 <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 9%">${
//                   mark.subjectId.maxMarks ?? ""
//                 }</td>
//                 <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 9%">${
//                   mark.marksObtained ?? ""
//                 }</td>
//                 <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 8%">${
//                   mark.subjectId.credits ?? ""
//                 }</td>
//                 <td class="p-0 m-0 text-center align-top" style="width: 7%">${
//                   mark.subjectId.name ? getGrade(Math.round((mark.marksObtained/mark.subjectId.maxMarks)*100)) : ""
//                 }</td>
//              </tr>
//             `
//               )
//               .join("")}
//             <tr class="font-bold align-bottom mt-auto text-sm max-h-[18px]">
//                 <td class="border-t border-black"></td>
//                 <td class="border-t border-r border-black p-0 m-0 text-right pr-2">Total</td>
//                 <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
//                   student.marks,
//                   "maxMarks"
//                 )}</td>
//                 <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
//                   student.marks,
//                   "marksObtained"
//                 )}</td>
//                 <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
//                   student.marks,
//                   "credits"
//                 )}</td>
//                 <td class="border-t border-black p-0 m-0 text-center">-</td>
//               </tr>
//           </tbody>
//         </table>

//                 </div>
//                 <div class="flex flex-col align-bottom h-[]">
//         <div class="text-center font-bold mt-4">Current Semester Performance</div>

//         <table class="w-full border border-black">
//           <thead>
//             <tr class="border border-black text-sm">
//               <th class="border border-black w-1/3">Total Subject Credits</th>
//               <th class="border border-black w-1/3">Total Credit Points</th>
//               <th class="border border-black w-1/3">SGPA</th>
//             </tr>
//           </thead>
//           <tbody>
//               <tr class="text-center">
//                 <td class="border-r border-black">${getTotal(
//                   student.marks,
//                   "credits"
//                 )}</td>
//                 <td class="border-r border-black">${getTotalCreditPoints(
//                   student.marks
//                 )}</td>
//                 <td class="border-r border-black">${(
//                   getTotalCreditPoints(student.marks) /
//                   getTotal(student.marks, "credits")
//                 ).toFixed(2)}
//                 </td>
//               </tr>
//           </tbody>
//         </table>

//         <div class="mt-4 font-thin">
//           <div class="flex">
//                 <div>
//                     <p class="text-md font-bold">Date</p>
//                 </div>
//                 <div>
//                     <p class="px-2 text-md font-bold">:</p>
//                 </div>
//                 <div>
//                     <p class="text-md">${formatDate(student.dateOfIssue)}</p>
//                 </div>
//             </div>
//         <div class="flex">
//                 <div>
//                     <p class="text-md font-bold">Place</p>
//                 </div>
//                 <div>
//                     <p class="px-2 text-md font-bold">:</p>
//                 </div>
//                 <div>
//                     <p class="text-md">Namchi, Sikkim</p>
//                 </div>
//             </div>
//         <div class="flex justify-between font-bold mt-16">
//           <div></div>
//           <div class="relative ml-24">
//           <div class="absolute -top-24 -z-10">
//                 <img src="${qrCodeDataUrl}" alt="QR Code" class="w-16 h-16" />
//           </div>

//           </div>
//           <div></div>
//         </div>
//        <p class="text-base font-light">NOTE:<span class="text-xs tracking-wide font-light">This is a system-generated marksheet and does not require manual authentication or signatures.</span></p>
//        </div>
//       </div>
//     </body>
//     </html>
//   `;

//   // Function to get grade based on marks
//   function getGrade(marks) {
//     if (marks >= 90) return "A+";
//     if (marks >= 80) return "A";
//     if (marks >= 70) return "B+";
//     if (marks >= 60) return "B";
//     if (marks >= 50) return "C+";
//     if (marks >= 40) return "C";
//     return "F";
//   }

//   function getTotalCreditPoints(marksArray) {
//     const gradePointMap = {
//       "A+": 10,
//       A: 9,
//       "B+": 8,
//       B: 7,
//       "C+": 6,
//       C: 6,
//       D: 5,
//       E: 4,
//       F: 0,
//     };

//     let totalCreditPoints = 0;

//     for (const item of marksArray) {

//       const marks = Number(item.marksObtained);
//       const credits = Number(item.subjectId?.credits);

//       if (isNaN(marks) || isNaN(credits) || credits === 0) continue;

//       const grade = getGrade(
//   Math.round((item.marksObtained / item.subjectId.maxMarks) * 100)
// );
//       const gradePoint = gradePointMap[grade] ?? 0;

//       totalCreditPoints += gradePoint * credits;
//     }

//     return totalCreditPoints;
//   }

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   const page = await browser.newPage();
//   await page.setContent(htmlContent, { waitUntil: "networkidle0" });

//   const pdfPath = path.join(__dirname, `${student.admission.student.name}_result.pdf`);
//   await page.pdf({ path: pdfPath, format: "A4", printBackground: true });

//   await browser.close();
//   return pdfPath;
// }

async function generateResultPDF(student) {
  const qrContent = `https://mobile.sgtu.ac.in/verify/${student._id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrContent);
  const courseName = !student.course?.hasStream
    ? student.course.name
    : `${student.course.name} (${student.stream?.name})`;
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
    <body 
  class="font-mono border border-transparent" 
  style="font-family: 'Nimbux Roman', serif; background-image: url(${bg}); background-size: 794px 1123px; background-repeat: no-repeat; background-position: top left; width: 794px; height: 1123px;">

      <div class="flex flex-col relative mx-auto h-[860px] px-16 pt-2 mt-48">
        <div class="h-[615px]">
        <div class="absolute text-xl right-16 -top-4 font-bold">S.No.:${
          student.serialNumber
        }</div>
        <h1 class="text-lg uppercase text-center font-extrabold">Statement of grades</h1>
        <h1 class="text-md font-extrabold uppercase text-center -mt-1">${courseName}</h1>
        <div class="flex justify-between mt-4 text-sm">
          <div class="flex">
            <div>
              <p class="font-bold">Student's Name</p>
              <p class="font-bold">Father's Name</p>
              <p class="font-bold capitalize">${getTenureLabel(student.course)}</p>
            </div>
            <div>
              <p class="px-2 pl-4 font-bold">:</p>
              <p class="px-2 pl-4 font-bold">:</p>
              <p class="px-2 pl-4 font-bold">:</p>
            </div>
            <div>
                <p class="uppercase">${student.admission.student.name}</p>
                <p class="uppercase">${student.admission.student.fatherName}</p>
                <p class="">${getTenureValue(student)}</p>
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
                <p class="">${student.admission.enrollmentNumber}</p>
                <p class="">${formatDateExamination(
                  student.examinationDate,
                )}</p>
                <p class="">${formatDate(student.dateOfDeclare)}</p>
            </div>
          </div>
        </div>


        <table class="w-full border border-black mt-2">
          <thead class="">
            <tr class="border border-black font-bold">
              <th class="border border-black text-xs p-0 m-0">Subject Code</th>
              <th class="border border-black text-xs p-0 m-0">Subject Name</th>
              <th class="border border-black text-xs p-0 m-0">Max. Marks</th>
              <th class="border border-black text-xs p-0 m-0">Marks Obtained</th>
              <th class="border border-black text-xs p-0 m-0">Subject Credits</th>
              <th class="border border-black text-xs p-0 m-0">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${newSubjects
              .map(
                (mark) => `
              <tr class="text-left font-bold text-[12px] ${
                mark.subjectId.code === "" ? "h-4" : "h-2"
              }">
                <td class="border-r border-black p-0 m-0 text-left pl-2 align-top" style="width: 13%">${
                  mark.subjectId.code
                }</td>
                <td class="border-r border-black p-0 m-0 text-left px-1 uppercase" style="width: 48%">${
                  mark.subjectId.name
                }</td>
                <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 9%">${
                  mark.subjectId.maxMarks ?? ""
                }</td>
                <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 9%">${
                  mark.marksObtained ?? ""
                }</td>
                <td class="border-r border-black p-0 m-0 text-center align-top" style="width: 8%">${
                  mark.subjectId.credits ?? ""
                }</td>
                <td class="p-0 m-0 text-center align-top" style="width: 7%">${
                  mark.subjectId?.name
                    ? getGrade(
                        Math.round(
                          (mark.marksObtained / mark.subjectId.maxMarks) * 100,
                        ),
                      )
                    : ""
                }
                </td>
             </tr>
            `,
              )
              .join("")}
            <tr class="font-bold align-bottom mt-auto text-sm max-h-[18px]">
                <td class="border-t border-black"></td>
                <td class="border-t border-r border-black p-0 m-0 text-right pr-2">Total</td>
                <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
                  student.marks,
                  "maxMarks",
                )}</td>
                <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
                  student.marks,
                  "marksObtained",
                )}</td>
                <td class="border-t border-r border-black p-0 m-0 text-center">${getTotal(
                  student.marks,
                  "credits",
                )}</td>
                <td class="border-t border-black p-0 m-0 text-center">-</td>
              </tr>
          </tbody>
        </table>

                </div>
                <div class="flex flex-col align-bottom h-[]">
        <div class="text-center font-bold mt-4">${getPerformanceLabel(student)}</div>

        <table class="w-full border border-black">
          <thead>
            <tr class="border border-black text-sm">
              <th class="border border-black w-1/3">Total Subject Credits</th>
              <th class="border border-black w-1/3">Total Credit Points</th>
              <th class="border border-black w-1/3">SGPA</th>
            </tr>
          </thead>
          <tbody>
              <tr class="text-center">
                <td class="border-r border-black">${getTotal(
                  student.marks,
                  "credits",
                )}</td>
                <td class="border-r border-black">${getTotalCreditPoints(
                  student.marks,
                )}</td>
                <td class="border-r border-black">${(
                  getTotalCreditPoints(student.marks) /
                  getTotal(student.marks, "credits")
                ).toFixed(2)}
                </td>
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
              <p class="font-serif font-light">${formatDate(
                student.dateOfIssue,
              )}</p>
              <p class="-mt-2 font-serif font-light">Namchi, Sikkim</p>
            </div>
          </div>
        <div class="flex justify-between font-bold mt-16">
          <div>Prepared By</div>
          <div class="relative ml-24">
          <div class="absolute -top-24 -z-10 bg-transparent">
                <img src="${qrCodeDataUrl}" alt="QR Code" class="w-14 h-14" />
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

  // Function to get grade based on marks
  function getGrade(marks) {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B+";
    if (marks >= 60) return "B";
    if (marks >= 50) return "C+";
    if (marks >= 40) return "C";
    return "F";
  }

  function getTotalCreditPoints(marksArray) {
    const gradePointMap = {
      "A+": 10,
      A: 9,
      "B+": 8,
      B: 7,
      "C+": 6,
      C: 5, // if you want C and C+ different, adjust here
      D: 4,
      F: 0,
    };

    let totalCreditPoints = 0;

    for (const item of marksArray) {
      // coerce to number ('' or null → 0, undefined → NaN)
      const marks = Number(item.marksObtained);
      const credits = Number(item.subjectId?.credits);

      // skip if either is NaN or zero credits
      if (isNaN(marks) || isNaN(credits) || credits === 0) continue;

      const grade = getGrade(
        Math.round((item.marksObtained / item.subjectId.maxMarks) * 100),
      );
      const gradePoint = gradePointMap[grade] ?? 0;

      totalCreditPoints += gradePoint * credits;
    }

    return totalCreditPoints;
  }

  // Launch Puppeteer, generate PDF and save it
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  // Save the PDF to the server
  const pdfPath = path.join(
    __dirname,
    `${student.admission.student.name}_result.pdf`,
  );
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });

  await browser.close();
  return pdfPath; // Return the path of the generated PDF
}

module.exports = { generateResultPDF };
