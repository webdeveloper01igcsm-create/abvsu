/**
 * Test Script: Academic Records Merged File Pricing Logic
 * Tests the new pricing logic for selected document types (merged mode)
 */

const testGetSelectedDocumentCount = () => {
  console.log("\n=== Testing getSelectedDocumentCount Logic ===\n");

  // Simulate the function
  const getSelectedDocumentCount = (payload) => {
    let count = 0;
    if (
      String(payload.selectedTypes?.marksheet || payload.marksheet) === "true"
    )
      count += 1;
    if (
      String(
        payload.selectedTypes?.provisionalCertificate ||
          payload.provisionalCertificate,
      ) === "true"
    )
      count += 1;
    if (
      String(
        payload.selectedTypes?.degreeCertificate || payload.degreeCertificate,
      ) === "true"
    )
      count += 1;
    if (
      String(
        payload.selectedTypes?.transcriptCertificate ||
          payload.transcriptCertificate,
      ) === "true"
    )
      count += 1;
    return count;
  };

  const testCases = [
    {
      name: "No documents selected",
      payload: {
        marksheet: "false",
        provisionalCertificate: "false",
        degreeCertificate: "false",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents via Email",
      },
      expectedCount: 0,
      expectedPrice: null,
    },
    // --- E-copy Normal (1000/doc) ---
    {
      name: "E-copy Normal — 1 doc (marksheet)",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "false",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents via Email",
      },
      expectedCount: 1,
      expectedPrice: 1000,
    },
    {
      name: "E-copy Normal — 2 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "true",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents via Email",
      },
      expectedCount: 2,
      expectedPrice: 2000,
    },
    {
      name: "E-copy Normal — 4 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "true",
        degreeCertificate: "true",
        transcriptCertificate: "true",
        applyFor: "Verification of Documents via Email",
      },
      expectedCount: 4,
      expectedPrice: 4000,
    },
    // --- E-copy Express (2500/doc) ---
    {
      name: "E-copy Express — 1 doc",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "false",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents via Email",
        expressMode: "true",
      },
      expectedCount: 1,
      expectedPrice: 2500,
    },
    {
      name: "E-copy Express — 4 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "true",
        degreeCertificate: "true",
        transcriptCertificate: "true",
        applyFor: "Verification of Documents via Email",
        expressMode: "true",
      },
      expectedCount: 4,
      expectedPrice: 10000,
    },
    // --- Physical Normal (1500/doc) ---
    {
      name: "Physical Normal — 1 doc",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "false",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents by Post",
      },
      expectedCount: 1,
      expectedPrice: 1500,
    },
    {
      name: "Physical Normal — 2 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "true",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents by Post",
      },
      expectedCount: 2,
      expectedPrice: 3000,
    },
    {
      name: "Physical Normal — 4 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "true",
        degreeCertificate: "true",
        transcriptCertificate: "true",
        applyFor: "Verification of Documents by Post",
      },
      expectedCount: 4,
      expectedPrice: 6000,
    },
    // --- Physical Express (4000/doc) ---
    {
      name: "Physical Express — 1 doc",
      payload: {
        marksheet: "true",
        provisionalCertificate: "false",
        degreeCertificate: "false",
        transcriptCertificate: "false",
        applyFor: "Verification of Documents by Post",
        expressMode: "true",
      },
      expectedCount: 1,
      expectedPrice: 4000,
    },
    {
      name: "Physical Express — 4 docs",
      payload: {
        marksheet: "true",
        provisionalCertificate: "true",
        degreeCertificate: "true",
        transcriptCertificate: "true",
        applyFor: "Verification of Documents by Post",
        expressMode: "true",
      },
      expectedCount: 4,
      expectedPrice: 16000,
    },
  ];

  let passCount = 0;
  let failCount = 0;

  // Mirror the production pricing matrix
  const VERIFICATION_RATES = {
    "E-copy": { Normal: 1000, Express: 2500 },
    Physical: { Normal: 1500, Express: 4000 },
  };
  const resolveDeliveryType = (applyFor) =>
    applyFor === "Verification of Documents by Post" ? "Physical" : "E-copy";
  const calculateVerificationAmount = (
    deliveryType,
    expressSelected,
    docCount,
  ) => {
    const speed = expressSelected ? "Express" : "Normal";
    const ratePerDoc = VERIFICATION_RATES[deliveryType]?.[speed] ?? 1000;
    return docCount * ratePerDoc;
  };

  testCases.forEach((test) => {
    const count = getSelectedDocumentCount(test.payload);
    const expressSelected = String(test.payload.expressMode) === "true";
    const deliveryType = resolveDeliveryType(
      test.payload.applyFor || "Verification of Documents via Email",
    );
    const price =
      count > 0
        ? calculateVerificationAmount(deliveryType, expressSelected, count)
        : null;

    const countMatch = count === test.expectedCount;
    const priceMatch = price === test.expectedPrice;

    if (countMatch && priceMatch) {
      console.log(`✓ PASS: ${test.name}`);
      console.log(`  - Count: ${count} (expected ${test.expectedCount})`);
      if (price !== null) {
        console.log(`  - Price: ₹${price} (expected ₹${test.expectedPrice})`);
      }
      passCount++;
    } else {
      console.log(`✗ FAIL: ${test.name}`);
      console.log(
        `  - Count: ${count} (expected ${test.expectedCount}) ${countMatch ? "✓" : "✗"}`,
      );
      if (price !== null) {
        console.log(
          `  - Price: ₹${price} (expected ₹${test.expectedPrice}) ${priceMatch ? "✓" : "✗"}`,
        );
      }
      failCount++;
    }
    console.log();
  });

  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passCount}/${testCases.length}`);
  console.log(`Failed: ${failCount}/${testCases.length}`);

  return failCount === 0;
};

const testModeDetection = () => {
  console.log("\n=== Testing Mode Detection Logic ===\n");

  // Test mode detection
  const testCases = [
    {
      name: "Merged mode detected (mergedDocumentsFile exists)",
      filesInput: { mergedDocumentsFile: [{ filename: "merged.pdf" }] },
      expectedMode: "merged",
    },
    {
      name: "Legacy mode (no mergedDocumentsFile)",
      filesInput: { marksheetFile: [{ filename: "marksheet.pdf" }] },
      expectedMode: "legacy",
    },
    {
      name: "Legacy mode (empty files)",
      filesInput: {},
      expectedMode: "legacy",
    },
  ];

  let passCount = 0;
  let failCount = 0;

  testCases.forEach((test) => {
    const isMergedMode = !!test.filesInput.mergedDocumentsFile?.[0];
    const detectedMode = isMergedMode ? "merged" : "legacy";
    const isPass = detectedMode === test.expectedMode;

    if (isPass) {
      console.log(`✓ PASS: ${test.name}`);
      console.log(`  - Mode: ${detectedMode}\n`);
      passCount++;
    } else {
      console.log(`✗ FAIL: ${test.name}`);
      console.log(
        `  - Mode: ${detectedMode} (expected ${test.expectedMode})\n`,
      );
      failCount++;
    }
  });

  console.log(`=== Results ===`);
  console.log(`Passed: ${passCount}/${testCases.length}`);
  console.log(`Failed: ${failCount}/${testCases.length}\n`);

  return failCount === 0;
};

const testEnrollmentMasking = () => {
  console.log("\n=== Testing Enrollment Masking Logic ===\n");

  const maskEnrollment = (enrollmentNumber) =>
    enrollmentNumber?.replace(/^\d+(?=\d{4}$)/, (m) =>
      "*".repeat(Math.max(0, m.length)),
    ) || enrollmentNumber;

  const testCases = [
    {
      name: "Standard 12-char enrollment",
      input: "123456789012",
      expected: "********9012",
    },
    {
      name: "10-char enrollment",
      input: "1234567890",
      expected: "******7890",
    },
    {
      name: "6-char enrollment",
      input: "123456",
      expected: "**3456", // Last 4 digits: 3456, first 2 replaced with **
    },
    {
      name: "Enrollment with less than 4 chars",
      input: "123",
      expected: "123", // Should show as-is (no masking)
    },
    {
      name: "Empty enrollment",
      input: "",
      expected: "",
    },
    {
      name: "Null enrollment",
      input: null,
      expected: null,
    },
  ];

  let passCount = 0;
  let failCount = 0;

  testCases.forEach((test) => {
    const masked = maskEnrollment(test.input);
    const isPass = masked === test.expected;

    if (isPass) {
      console.log(`✓ PASS: ${test.name}`);
      console.log(`  - Input: ${test.input} → Output: ${masked}\n`);
      passCount++;
    } else {
      console.log(`✗ FAIL: ${test.name}`);
      console.log(`  - Input: ${test.input}`);
      console.log(`  - Expected: ${test.expected}`);
      console.log(`  - Got: ${masked}\n`);
      failCount++;
    }
  });

  console.log(`=== Results ===`);
  console.log(`Passed: ${passCount}/${testCases.length}`);
  console.log(`Failed: ${failCount}/${testCases.length}\n`);

  return failCount === 0;
};

// Run all tests
console.log("\n╔════════════════════════════════════════════╗");
console.log("║   Academic Records Pricing Logic Tests   ║");
console.log("╚════════════════════════════════════════════╝");

const test1 = testGetSelectedDocumentCount();
const test2 = testModeDetection();
const test3 = testEnrollmentMasking();

console.log("\n╔════════════════════════════════════════════╗");
console.log("║         OVERALL TEST SUMMARY              ║");
console.log("╚════════════════════════════════════════════╝\n");

const allPass = test1 && test2 && test3;
if (allPass) {
  console.log("✓ ALL TESTS PASSED\n");
  process.exit(0);
} else {
  console.log("✗ SOME TESTS FAILED\n");
  process.exit(1);
}
