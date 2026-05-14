const puppeteer = require("puppeteer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const generateIDCardPDF = async (idCard) => {
  try {
    const student = idCard.admission.student;
    const admission = idCard.admission;

    const safeText = (value, fallback = "N/A") => {
      if (value === undefined || value === null || value === "") {
        return fallback;
      }
      return value;
    };

    const resolvePhotoSrc = async () => {
      if (!idCard.photo) return null;
      if (idCard.photo.startsWith("data:")) return idCard.photo;

      const relativePath = idCard.photo.replace(/^\/+/, "");
      const absolutePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(absolutePath)) {
        try {
          const resizedBuffer = await sharp(absolutePath)
            .resize({ width: 300, height: 400, fit: "cover" })
            .jpeg({ quality: 70 })
            .toBuffer();
          return `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
        } catch (error) {
          const ext = path.extname(absolutePath).toLowerCase();
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
                ? "image/jpeg"
                : null;
          if (mime) {
            const base64 = fs.readFileSync(absolutePath).toString("base64");
            return `data:${mime};base64,${base64}`;
          }
        }
      }

      return idCard.photo;
    };

    const courseName = safeText(admission.course?.name);
    const sessionName = safeText(admission.session?.session);
    const photoSrc = await resolvePhotoSrc();

    // Generate QR code
    const qrCodeData = JSON.stringify({
      cardNumber: idCard.cardNumber,
      enrollmentNumber: admission.enrollmentNumber,
      name: safeText(student.name),
      course: courseName,
    });
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    // Format dates
    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    // HTML template for ID card
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            background: #f0f0f0;
            padding: 20px;
          }
          
          .id-card-wrapper {
            width: 3.375in;
            height: 2.125in;
            margin: 0 auto;
            page-break-after: always;
          }
          
          .id-card {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
          }
          
          .id-card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          }
          
          .header {
            text-align: center;
            color: white;
            margin-bottom: 10px;
            position: relative;
          }
          
          .university-name {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .id-type {
            font-size: 10px;
            margin-top: 3px;
            opacity: 0.9;
          }
          
          .content {
            display: flex;
            gap: 15px;
            position: relative;
          }
          
          .photo-section {
            flex-shrink: 0;
          }
          
          .photo {
            width: 80px;
            height: 100px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }
          
          .photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .details-section {
            flex: 1;
            color: white;
          }
          
          .detail-row {
            margin-bottom: 8px;
            font-size: 9px;
          }
          
          .detail-label {
            font-weight: 600;
            opacity: 0.8;
            display: inline-block;
            min-width: 80px;
          }
          
          .detail-value {
            font-weight: 500;
          }
          
          .qr-section {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 5px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }
          
          .qr-section img {
            width: 50px;
            height: 50px;
            display: block;
          }
          
          .card-number {
            position: absolute;
            bottom: 10px;
            left: 20px;
            color: white;
            font-size: 8px;
            font-weight: bold;
            opacity: 0.9;
          }
          
          .valid-till {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 7px;
            opacity: 0.8;
          }
          
          /* Back of ID Card */
          .id-card-back {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
            color: white;
            page-break-before: always;
          }
          
          .back-header {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255,255,255,0.3);
          }
          
          .emergency-section {
            margin-bottom: 15px;
          }
          
          .section-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .back-detail {
            font-size: 9px;
            margin-bottom: 6px;
            line-height: 1.4;
          }
          
          .signature-section {
            position: absolute;
            bottom: 20px;
            right: 20px;
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid white;
            margin-top: 30px;
            padding-top: 5px;
            font-size: 8px;
          }
        </style>
      </head>
      <body>
        <!-- Front of ID Card -->
        <div class="id-card-wrapper">
          <div class="id-card">
            <div class="header">
              <div class="university-name">Sikkim Global Tech University</div>
              <div class="id-type">Student Identity Card</div>
            </div>
            
            <div class="content">
              <div class="photo-section">
                <div class="photo">
                  ${photoSrc ? `<img src="${photoSrc}" alt="Student Photo" />` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#ddd;color:#666;font-size:12px;">No Photo</div>'}
                </div>
              </div>
              
              <div class="details-section">
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${safeText(student.name)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Father's Name:</span>
                  <span class="detail-value">${safeText(student.fatherName)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Enrollment:</span>
                  <span class="detail-value">${safeText(admission.enrollmentNumber)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Course:</span>
                  <span class="detail-value">${courseName}</span>
                </div>
                ${
                  admission.stream
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Stream:</span>
                  <span class="detail-value">${admission.stream.name}</span>
                </div>
                `
                    : ""
                }
                <div class="detail-row">
                  <span class="detail-label">Session:</span>
                  <span class="detail-value">${sessionName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">DOB:</span>
                  <span class="detail-value">${formatDate(student.dateOfBirth)}</span>
                </div>
                ${
                  idCard.bloodGroup
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Blood Group:</span>
                  <span class="detail-value">${idCard.bloodGroup}</span>
                </div>
                `
                    : ""
                }
              </div>
            </div>
            
            <div class="qr-section">
              <img src="${qrCodeImage}" alt="QR Code" />
            </div>
            
            <div class="card-number">
              Card No: ${idCard.cardNumber}
            </div>
            
            <div class="valid-till">
              Valid Till: ${formatDate(idCard.validTill)}
            </div>
          </div>
        </div>
        
        <!-- Back of ID Card -->
        <div class="id-card-wrapper">
          <div class="id-card-back">
            <div class="back-header">
              Important Information
            </div>
            
            ${
              idCard.address
                ? `
            <div class="emergency-section">
              <div class="section-title">Address</div>
              <div class="back-detail">${idCard.address}</div>
            </div>
            `
                : ""
            }
            
            ${
              idCard.emergencyContact?.name || idCard.emergencyContact?.phone
                ? `
            <div class="emergency-section">
              <div class="section-title">Emergency Contact</div>
              ${idCard.emergencyContact.name ? `<div class="back-detail"><strong>Name:</strong> ${idCard.emergencyContact.name}</div>` : ""}
              ${idCard.emergencyContact.phone ? `<div class="back-detail"><strong>Phone:</strong> ${idCard.emergencyContact.phone}</div>` : ""}
            </div>
            `
                : ""
            }
            
            <div class="emergency-section">
              <div class="section-title">Instructions</div>
              <div class="back-detail">• This card is property of SGTU</div>
              <div class="back-detail">• If found, please return to university</div>
              <div class="back-detail">• Must be carried on campus at all times</div>
              <div class="back-detail">• Report immediately if lost</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-line">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const createFallbackPdf = async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([243, 306]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let y = 290;
      const drawLine = (label, value) => {
        const text = `${label}: ${safeText(value)}`;
        page.drawText(text, { x: 10, y, size: 8, font });
        y -= 12;
      };

      if (photoSrc && photoSrc.startsWith("data:image/")) {
        const base64 = photoSrc.split(",")[1];
        const bytes = Buffer.from(base64, "base64");
        const image = photoSrc.startsWith("data:image/png")
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        page.drawImage(image, { x: 10, y: 200, width: 60, height: 80 });
      }

      drawLine("Name", student.name);
      drawLine("Father", student.fatherName);
      drawLine("Enroll", admission.enrollmentNumber);
      drawLine("Course", courseName);
      if (admission.stream?.name) {
        drawLine("Stream", admission.stream.name);
      }
      drawLine("Session", sessionName);
      drawLine("Valid Till", formatDate(idCard.validTill));

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    };

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "3.375in",
      height: "4.25in", // 2 cards
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const normalizedBuffer = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer);

    const header = normalizedBuffer.subarray(0, 4).toString();
    let isValid = header === "%PDF";

    if (isValid) {
      try {
        await PDFDocument.load(normalizedBuffer);
      } catch (error) {
        isValid = false;
      }
    }

    if (!isValid) {
      return await createFallbackPdf();
    }

    return normalizedBuffer;
  } catch (error) {
    console.error("Error generating ID card PDF:", error);
    throw error;
  }
};

module.exports = { generateIDCardPDF };
