const SkillCertificateSerial = require('../models/SkillCertificateSerial');

async function getNextSkillCertificateSerialNumber({
  sessionId,
  courseId,
  certificateTypeId,
  streamId = null,
}) {
  const MAX_RETRIES = 5;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    const counter = await SkillCertificateSerial.findOne({
      session: sessionId,
      course: courseId,
      stream: streamId || null,
      certificateType: certificateTypeId,
    });

    if (!counter) {
      throw new Error('Serial prefix not set for this session + course + stream + certificate type');
    }

    const currentStr = counter.lastNumber || '0000';
    const currentNum = Number.parseInt(currentStr, 10);

    if (Number.isNaN(currentNum)) {
      throw new Error('Invalid lastNumber configured for skill certificate series');
    }

    const nextStr = String(currentNum + 1).padStart(currentStr.length, '0');

    const result = await SkillCertificateSerial.updateOne(
      {
        _id: counter._id,
        lastNumber: currentStr,
      },
      {
        lastNumber: nextStr,
      }
    );

    if (result.modifiedCount === 1) {
      return `${counter.prefix}${nextStr}`;
    }

    retryCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Failed to generate skill certificate serial number after retries');
}

module.exports = { getNextSkillCertificateSerialNumber };