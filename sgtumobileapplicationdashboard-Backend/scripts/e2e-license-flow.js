const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const dbConnect = require("../middlewares/db");
const Admission = require("../models/Admission");
require("../models/Student");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5005";

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl9xW8AAAAASUVORK5CYII=";

const log = (label, value) => {
  if (value === undefined) {
    console.log(label);
    return;
  }
  console.log(`${label}:`, value);
};

async function getCandidateCredentials() {
  const admissions = await Admission.find({})
    .select("enrollmentNumber student")
    .populate({
      path: "student",
      select: "aadharNumber subscriptionDetails undertaking license",
    })
    .limit(100);

  const candidate = admissions.find((record) => {
    const aadhar = record?.student?.aadharNumber;
    const enrollment = record?.enrollmentNumber;
    const isActive = record?.student?.subscriptionDetails?.isActive;
    return (
      enrollment &&
      typeof aadhar === "number" &&
      String(aadhar).length === 12 &&
      isActive === true
    );
  });

  if (!candidate) {
    throw new Error("No active student with usable credentials found in first 100 records.");
  }

  return {
    enrollmentNumber: candidate.enrollmentNumber,
    aadharNumber: candidate.student.aadharNumber,
  };
}

async function apiJson(pathname, options = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_err) {
    json = null;
  }

  return { response, text, json };
}

async function run() {
  log("E2E", "Starting authenticated undertaking/license flow test");
  await dbConnect();

  const creds = await getCandidateCredentials();
  log("Using enrollment", creds.enrollmentNumber);

  const loginResult = await apiJson("/student/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enrollmentNumber: creds.enrollmentNumber,
      aadharNumber: creds.aadharNumber,
    }),
  });

  log("Login status", loginResult.response.status);
  if (!loginResult.response.ok) {
    throw new Error(`Login failed: ${loginResult.text}`);
  }

  const token = loginResult.json?.token;
  if (!token) {
    throw new Error("Login succeeded but token missing.");
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  const initialState = await apiJson("/student/session-state", {
    method: "GET",
    headers: authHeaders,
  });

  log("Session-state status", initialState.response.status);
  if (!initialState.response.ok || !initialState.json) {
    throw new Error(`Session-state failed: ${initialState.text}`);
  }

  log("Initial undertakingPending", initialState.json.undertakingPending);
  log("Initial licenseExpired", initialState.json.licenseExpired);

  if (initialState.json.undertakingPending) {
    const tempFile = path.join(os.tmpdir(), `sgtu-signature-${Date.now()}.png`);
    fs.writeFileSync(tempFile, Buffer.from(tinyPngBase64, "base64"));

    const formData = new FormData();
    formData.append("accepted", "true");
    const fileBlob = new Blob([fs.readFileSync(tempFile)], { type: "image/png" });
    formData.append("signature", fileBlob, "signature.png");

    const submitRes = await fetch(`${API_BASE_URL}/student/undertaking`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    const submitText = await submitRes.text();
    log("Undertaking submit status", submitRes.status);
    if (!submitRes.ok) {
      throw new Error(`Undertaking submit failed: ${submitText}`);
    }
  }

  const postUndertakingState = await apiJson("/student/session-state", {
    method: "GET",
    headers: authHeaders,
  });

  log("Post-undertaking status", postUndertakingState.response.status);
  if (!postUndertakingState.response.ok || !postUndertakingState.json) {
    throw new Error(`Post-undertaking session-state failed: ${postUndertakingState.text}`);
  }

  log("Post undertakingPending", postUndertakingState.json.undertakingPending);
  log("Post licenseExpired", postUndertakingState.json.licenseExpired);

  const renewalRes = await fetch(`${API_BASE_URL}/student/license/create-order`, {
    method: "POST",
    headers: authHeaders,
  });

  const renewalText = await renewalRes.text();
  log("Renewal create-order status", renewalRes.status);

  if (!renewalRes.ok) {
    throw new Error(`Renewal order failed: ${renewalText}`);
  }

  const hasPaymentForm =
    renewalText.includes("transaction.do?command=initiateTransaction") &&
    renewalText.includes("encRequest") &&
    renewalText.includes("access_code");

  log("Renewal form generated", hasPaymentForm);
  if (!hasPaymentForm) {
    throw new Error("Renewal response did not contain expected Razorpay form markup.");
  }

  log("E2E", "Flow test completed successfully");
}

run()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error("E2E failure:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
