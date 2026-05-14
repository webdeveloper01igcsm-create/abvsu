const SerialCounter = require("../models/SerialCounter");

async function getNextSerialNumber(courseId, semester, streamId = null) {
  const MAX_RETRIES = 5;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // 1. Find the current counter
      const counter = await SerialCounter.findOne({
        course: courseId,
        semester,
        stream: streamId || null
      });

      if (!counter) {
        throw new Error("Serial prefix not set for this course + semester + stream");
      }

      // 2. Calculate next number (preserving leading zeros)
      const currentStr = counter.lastNumber || '0';
      const currentNum = parseInt(currentStr, 10);
      const nextNum = currentNum + 1;
      const nextStr = nextNum.toString().padStart(currentStr.length, '0');

      // 3. Atomically update only if lastNumber hasn't changed
      const result = await SerialCounter.updateOne(
        {
          _id: counter._id,
          lastNumber: currentStr // This ensures atomicity
        },
        {
          lastNumber: nextStr
        }
      );

      // 4. If update succeeded, return the new serial
      if (result.modifiedCount === 1) {
        return counter.prefix + nextStr;
      }

      // 5. If we got here, someone else modified the record - retry
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
    } catch (err) {
      console.error(`Attempt ${retryCount + 1} failed:`, err);
      throw err; // Re-throw after max retries
    }
  }

  throw new Error("Failed to generate serial number after retries");
}

module.exports = { getNextSerialNumber };