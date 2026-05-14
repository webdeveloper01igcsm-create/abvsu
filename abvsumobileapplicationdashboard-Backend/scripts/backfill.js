require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../models/Student");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const r1 = await Student.updateMany(
    { undertaking: { $exists: false } },
    { $set: { undertaking: { accepted: false, acceptedAt: null, signatureUrl: null } } }
  );

  const r2 = await Student.updateMany(
    { license: { $exists: false } },
    { $set: { license: { startDate: null, endDate: null, lastRenewedAt: null } } }
  );

  console.log("Undertaking backfilled:", r1.modifiedCount);
  console.log("License backfilled:", r2.modifiedCount);
  await mongoose.disconnect();
})();
