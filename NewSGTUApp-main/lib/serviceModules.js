export const DOCUMENT_MODULES = {
  "academic-records": {
    key: "academic-records",
    title: "Verification of Academic Records",
    endpoint: "academic-records",
    applyIntro:
      "Select document types, verify email with OTP, upload merged PDF, then proceed to payment for verification.",
    uploadHint:
      "Select document types below. Merge all selected documents into one PDF and upload (under 200KB). Verified amount based on selected types.",
    emptyStatusText:
      "You haven't applied for academic records verification yet.",
    supportsApplyFor: true,
    hasDocumentSelection: true,
    supportsDeliveryMode: true,
    amountByMode: {
      emailNormal: 1000,
      emailExpress: 2500,
      postNormal: 1500,
      postExpress: 4000,
    },
    files: [
      {
        key: "mergedDocumentsFile",
        label: "Merged Documents PDF",
        required: true,
      },
    ],
  },
  "character-certificate": {
    key: "character-certificate",
    title: "Character Certificate",
    endpoint: "character-certificate",
    applyIntro:
      "Verify your email, upload marksheet PDF, provide dispatch address, and complete payment.",
    uploadHint: "UPLOAD ALL MARKSHEETS (In single pdf file less than 200 kb).",
    emptyStatusText: "You haven't applied for character certificate yet.",
    supportsDeliveryMode: true,
    amountByMode: { normal: 2000, express: 3500 },
    files: [{ key: "marksheetFile", label: "Marksheet PDF", required: true }],
  },
  "migration-certificate": {
    key: "migration-certificate",
    title: "Migration Certificate",
    endpoint: "migration-certificate",
    applyIntro:
      "Verify your email and submit migration request details with marksheet upload.",
    uploadHint: "UPLOAD ALL MARKSHEETS (In single pdf file less than 200 kb).",
    emptyStatusText: "You haven't applied for migration certificate yet.",
    enforceSingleActive: true,
    supportsDeliveryMode: true,
    amountByMode: { normal: 5000, express: 7500 },
    files: [{ key: "marksheetFile", label: "Marksheet PDF", required: true }],
  },
  "course-completion-certificate": {
    key: "course-completion-certificate",
    title: "Course Completion Certificate",
    endpoint: "course-completion-certificate",
    applyIntro:
      "Verify your email and apply for course completion certificate with required documents.",
    uploadHint: "UPLOAD ALL MARKSHEETS (In single pdf file less than 200 kb).",
    emptyStatusText:
      "You haven't applied for course completion certificate yet.",
    enforceSingleActive: true,
    supportsDeliveryMode: true,
    amountByMode: { normal: 3000, express: 5000 },
    files: [{ key: "marksheetFile", label: "Marksheet PDF", required: true }],
  },
  "provisional-degree-certificate": {
    key: "provisional-degree-certificate",
    title: "Provisional Degree Certificate",
    endpoint: "provisional-degree-certificate",
    applyIntro:
      "Verify email and upload marksheet plus last migration file to apply.",
    uploadHint:
      "Migration from last University/Institute is mandatory to apply for Provisional Degree Certificate",
    emptyStatusText:
      "You haven't applied for provisional degree certificate yet.",
    enforceSingleActive: true,
    supportsDeliveryMode: true,
    amountByMode: { normal: 3000, express: 5000 },
    files: [
      { key: "marksheetFile", label: "UploadMarksheet PDF", required: true },
      {
        key: "lastMigrationFile",
        label: "Last Migration PDF",
        required: true,
      },
    ],
  },
  "degree-certificate": {
    key: "degree-certificate",
    title: "Degree Certificate",
    endpoint: "degree-certificate",
    applyIntro:
      "Apply for degree certificate with dispatch address details and complete payment.",
    uploadHint: "No document upload is required for this service.",
    emptyStatusText: "You haven't applied for degree certificate yet.",
    enforceSingleActive: true,
    supportsDeliveryMode: false,
    fixedAmount: 15000,
    files: [],
  },
  "transcript-certificate": {
    key: "transcript-certificate",
    title: "Transcript Certificate",
    endpoint: "transcript-certificate",
    applyIntro:
      "Verify email and upload marksheet plus last migration file for transcript request.",
    uploadHint:
      "Migration from last University/Institute is mandatory to apply for Provisional Degree Certificate.",
    emptyStatusText: "You haven't applied for transcript certificate yet.",
    enforceSingleActive: true,
    supportsDeliveryMode: true,
    amountByMode: { normal: 10000, express: 15000 },
    files: [
      { key: "marksheetFile", label: "Marksheet PDF", required: true },
      {
        key: "lastMigrationFile",
        label: "Last Migration PDF",
        required: true,
      },
    ],
  },
  "duplicate-document": {
    key: "duplicate-document",
    title: "Duplicate Document",
    endpoint: "duplicate-document",
    applyIntro:
      "Choose duplicate document type, verify email, upload affidavit, and complete payment.",
    uploadHint:
      "Affidavit is mandatory on Rs 10/- stamp paper duly notarized addressed to 'The Registrar, SGTU' stating the reason of loss of the document.",
    emptyStatusText: "You haven't applied for duplicate document yet.",
    supportsDeliveryMode: true,
    amountByMode: { normal: 2000, express: 3000 },
    enforceSingleActiveByType: true,
    supportsDuplicateType: true,
    files: [{ key: "affidavitFile", label: "Affidavit PDF", required: true }],
  },
};

export const DUPLICATE_DOCUMENT_OPTIONS = [
  "Duplicate Marksheets",
  "Duplicate Migration Certificate",
  "Duplicate Character Certificate",
  "Duplicate Course Completion Certificate",
  "Duplicate Provisional Degree",
  "Duplicate Degree",
  "Duplicate Transcript",
];

export const APPLY_FOR_OPTIONS = [
  "Verification of Documents via Email",
  "Verification of Documents by Post",
];

export const COUNTRY_OPTIONS = [
  "India",
  "Nepal",
  "Bhutan",
  "Bangladesh",
  "Sri Lanka",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
];

export const ADDRESS_INITIAL = {
  houseNo: "",
  street: "",
  district: "",
  state: "",
  country: "",
  pinCode: "",
  mobileNo: "",
  alternateNo: "",
  landmark: "",
};

export const ADDRESS_FIELDS = [
  { key: "houseNo", label: "House No *" },
  { key: "street", label: "Street *" },
  { key: "country", label: "Country *" },
  { key: "state", label: "State *" },
  { key: "district", label: "District *" },
  { key: "pinCode", label: "Pin Code *" },
  { key: "mobileNo", label: "Mobile No *" },
  { key: "alternateNo", label: "Alternate No *" },
  { key: "landmark", label: "Landmark *" },
];

export const PAYMENT_REDIRECT_PATHS = [
  "academic-records",
  "character-certificate",
  "migration-certificate",
  "course-completion-certificate",
  "provisional-degree-certificate",
  "degree-certificate",
  "transcript-certificate",
  "duplicate-document",
];
