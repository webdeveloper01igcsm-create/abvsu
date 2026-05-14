const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoSanitize = require("express-mongo-sanitize");
const authRoutes = require("./routes/auth.Routes");
const videoRoutes = require("./routes/videoVerification.Routes");
const studentRoutes = require("./routes/student.Routes");
const bulkStudentRoutes = require("./routes/bulkStudent.Routes");
const { verifyToken, checkPermission } = require("./middlewares/auth");
const SuperAdmin = require("./middlewares/admin");
const notificationRoute = require("./routes/notification.Routes");
const countRoute = require("./routes/count.Routes");
const resultRoute = require("./routes/result.Routes");
const paymentRoute = require("./routes/payment.Routes");
const courseRoute = require("./routes/course.Routes");
const courseTypeRoutes = require("./routes/courseType.Routes");
const subjectRoutes = require("./routes/subject.Routes");
const streamRoutes = require("./routes/stream.Routes");
const marksRoutes = require("./routes/marks.Routes");
const sessionRoutes = require("./routes/session.Routes");
const userRoutes = require("./routes/user.Routes");
const serialRoutes = require("./routes/serial.Routes");
const proSerialRoutes = require("./routes/provSerial.Routes");
const semesterSubjectRoutes = require("./routes/semesterSubject.Routes");
const academicDocRoutes = require("./routes/academicDoc.Routes");
const applicationRoutes = require("./routes/application.Route");
const degreeVerificationRoutes = require("./routes/degreeVerification.Routes");
const academicRecordVerificationRoutes = require("./routes/academicRecordVerification.Routes");
const characterCertificateRoutes = require("./routes/characterCertificate.Routes");
const migrationCertificateRoutes = require("./routes/migrationCertificate.Routes");
const courseCompletionCertificateRoutes = require("./routes/courseCompletionCertificate.Routes");
const provisionalDegreeCertificateRoutes = require("./routes/provisionalDegreeCertificate.Routes");
const degreeCertificateRoutes = require("./routes/degreeCertificate.Routes");
const transcriptCertificateRoutes = require("./routes/transcriptCertificate.Routes");
const duplicateDocumentRoutes = require("./routes/duplicateDocument.Routes");
const idCardRoutes = require("./routes/idCard.Routes");
const skillCertificateTypeRoutes = require("./routes/skillCertificateType.Routes");
const skillCertificateSerialRoutes = require("./routes/skillCertificateSerial.Routes");
const skillCertificateRoutes = require("./routes/skillCertificate.Routes");
const dbConnect = require("./middlewares/db");

dbConnect().then(() => {
  // SuperAdmin();
});

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const paymentUrlMode = String(process.env.PAYMENT_URL_MODE || "legacy")
  .trim()
  .toLowerCase();

if (!["legacy", "env_first"].includes(paymentUrlMode)) {
  console.warn(
    `[payment] Unknown PAYMENT_URL_MODE='${paymentUrlMode}', falling back to legacy behavior.`,
  );
}

if (!process.env.BASE_URL && !process.env.BACKEND_URL) {
  console.warn(
    "[payment] BASE_URL/BACKEND_URL not set. Callback URL generation may depend on request headers.",
  );
}

const DEFAULT_ALLOWED_ORIGINS = [
  "https://student.sgtu.ac.in",
  "https://api.sgtu.ac.in",
  "https://verification.sgtu.ac.in",
  "https://admin.sgtu.ac.in",
  "",
];

const additionalAllowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const developmentOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8081",
        "https://student.sgtu.ac.in",
        "https://api.sgtu.ac.in",
        "https://verification.sgtu.ac.in",
        "https://admin.sgtu.ac.in",
      ];

const allowedOrigins = [
  ...new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...additionalAllowedOrigins,
    ...developmentOrigins,
  ]),
];

const allowAllOrigins =
  String(process.env.ALLOW_ALL_ORIGINS || "")
    .trim()
    .toLowerCase() === "true";

if (allowAllOrigins) {
  console.warn(
    "[cors] ALLOW_ALL_ORIGINS=true. Accepting requests from all origins.",
  );
}

const isAllowedOrigin = (origin) => {
  if (allowAllOrigins) return true;
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

const corsOriginValidator = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Origin not allowed by CORS"));
};

const assertStrongSecret = (name, value, disallowed = []) => {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length < 24) {
    throw new Error(`${name} must be set to a strong value in production`);
  }
  if (disallowed.includes(normalized)) {
    throw new Error(`${name} is using an insecure placeholder value`);
  }
};

if (process.env.NODE_ENV === "production") {
  assertStrongSecret("JWT_SECRET", process.env.JWT_SECRET, [
    "your-secret-key",
    "changeme",
  ]);

  assertStrongSecret("STUDENT_SECRET", process.env.STUDENT_SECRET, [
    "SGTUSTUDENT2025",
    "student-secret",
  ]);

  const adminOtp = String(process.env.ADMIN_OTP || "").trim();
  if (!/^\d{6,10}$/.test(adminOtp)) {
    throw new Error(
      "ADMIN_OTP must be configured as a numeric code in production",
    );
  }
}

console.log(`[payment] URL mode: ${paymentUrlMode}`);
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// const io = new Server(server, {
//   cors: {
//     origin: [
//       // "*",
//       "http://192.168.1.11:3000",
//       "http://localhost:3000",
//       "http://127.0.0.1:3000",
//       "http://192.168.1.11:3001",
//       "exp://192.168.1.11:8081",
//       "http://localhost:8081",
//     ],
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });
// Security Middleware - Sanitize data to prevent NoSQL injection
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      console.warn(` Sanitized ${key} in ${req.method} ${req.path}`);
    },
  }),
);

app.use(express.json({ limit: "10kb" })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Limit URL-encoded payload size
// app.use(cors());
app.use(
  cors({
    origin: corsOriginValidator,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),

  cors({
    origin: [
      // "*",
      "http://192.168.1.35:8081",
      "http://localhost:8081",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://192.168.1.35:8081",
      "exp://192.168.1.11:8081",
      "http://localhost:8081",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    if (
      req.path === "/student/login" ||
      req.path === "/student/verify" ||
      req.path === "/student/session-state"
    ) {
      console.log("[diag] incoming request", {
        method: req.method,
        path: req.path,
        origin: req.headers.origin || "N/A",
        host: req.headers.host || "N/A",
        userAgent: req.headers["user-agent"] || "N/A",
      });
    }
    next();
  });
}

const enablePublicUploads =
  String(process.env.ENABLE_PUBLIC_UPLOADS || "")
    .trim()
    .toLowerCase() === "true";

if (enablePublicUploads) {
  app.use("/uploads", express.static("uploads"));
  console.warn(
    "[security] Public /uploads is enabled. Use only in trusted/internal environments.",
  );
} else {
  const uploadsStatic = express.static("uploads");

  app.use("/uploads", (req, res, next) => {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return res.status(403).json({
        success: false,
        message: "Direct file access is disabled",
      });
    }

    let tokenValid = false;
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      tokenValid = true;
    } catch (adminErr) {
      try {
        jwt.verify(token, process.env.STUDENT_SECRET);
        tokenValid = true;
      } catch (studentErr) {
        tokenValid = false;
      }
    }

    if (!tokenValid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized file access",
      });
    }

    return uploadsStatic(req, res, next);
  });
}

const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls" && ext !== ".csv") {
      return cb(
        new Error("Only Excel files (.xlsx or .xls) are allowed"),
        false,
      );
    }
    cb(null, true);
  },
});

app.use("/auth", authRoutes);
app.use("/student", studentRoutes);
app.use(
  "/bulkupload",
  verifyToken,
  checkPermission("Bulk Upload", "write"),
  upload.single("file"),
  bulkStudentRoutes,
);
app.use("/notification", notificationRoute);
app.use("/count", verifyToken, countRoute);
app.use("/result", resultRoute);
app.use("/payment", paymentRoute);
app.get("/verifyToken", verifyToken, (req, res) => {
  return res.json({ message: "Access granted!", user: req.user });
});
app.use("/verification", videoRoutes);
app.use("/courses", verifyToken, courseRoute);
app.use("/course-types", verifyToken, courseTypeRoutes);
app.use("/streams", streamRoutes);
app.use("/sessions", verifyToken, sessionRoutes);
app.use("/subjects", subjectRoutes);
app.use("/semester-subjects", semesterSubjectRoutes);
app.use("/serial", serialRoutes);
app.use("/provserial", verifyToken, proSerialRoutes);
app.use("/marks", marksRoutes);
app.use("/user", verifyToken, userRoutes);
app.use("/academic-docs", academicDocRoutes);
app.use("/applications", applicationRoutes);
app.use("/student-verification", degreeVerificationRoutes);
app.use("/academic-records", academicRecordVerificationRoutes);
app.use("/character-certificate", characterCertificateRoutes);
app.use("/migration-certificate", migrationCertificateRoutes);
app.use("/course-completion-certificate", courseCompletionCertificateRoutes);
app.use("/provisional-degree-certificate", provisionalDegreeCertificateRoutes);
app.use("/degree-certificate", degreeCertificateRoutes);
app.use("/transcript-certificate", transcriptCertificateRoutes);
app.use("/duplicate-document", duplicateDocumentRoutes);
app.use("/skill-certificate-types", skillCertificateTypeRoutes);
app.use("/skill-certificate-series", skillCertificateSerialRoutes);
app.use("/skill-certificates", skillCertificateRoutes);
app.use("/id-cards", idCardRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message, error: "MulterError" });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

const onlineStudents = new Map();
const onlineAdmins = new Set();

const emitPresence = () => {
  io.emit("presence:update", {
    students: Array.from(onlineStudents.values()),
    adminOnline: onlineAdmins.size > 0,
  });
};

io.use((socket, next) => {
  const { token, role } = socket.handshake.auth || {};
  if (!token || !role) {
    return next(new Error("Unauthorized"));
  }

  try {
    const secret =
      role === "student" ? process.env.STUDENT_SECRET : process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    socket.user = decoded;
    socket.role = role;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  if (socket.role === "student") {
    const admissionId = socket.user.id;
    onlineStudents.set(admissionId, {
      admissionId,
      name: socket.user.name,
      enrollmentNumber: socket.user.enrollmentNumber,
    });
    socket.join(`student:${admissionId}`);
  } else if (socket.role === "admin") {
    onlineAdmins.add(socket.id);
    socket.join("admins");
  }

  emitPresence();

  socket.on("presence:request", () => {
    emitPresence();
  });

  socket.on("chat:send", (payload) => {
    const message = (payload?.message || "").trim();
    if (!message) return;

    if (socket.role === "student") {
      io.to("admins").emit("chat:receive", {
        fromRole: "student",
        admissionId: socket.user.id,
        name: socket.user.name,
        enrollmentNumber: socket.user.enrollmentNumber,
        message,
        timestamp: Date.now(),
      });
      return;
    }

    if (socket.role === "admin") {
      const admissionId = payload?.admissionId;
      if (!admissionId) return;
      io.to(`student:${admissionId}`).emit("chat:receive", {
        fromRole: "admin",
        admissionId,
        message,
        timestamp: Date.now(),
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.role === "student") {
      onlineStudents.delete(socket.user.id);
    } else if (socket.role === "admin") {
      onlineAdmins.delete(socket.id);
    }
    emitPresence();
  });
});

// server.listen(5005, () => {
//   console.log("Server running on port 5005");
// });
// ...existing code...

server.listen(5005, "0.0.0.0", () => {
  console.log("Server running on http://localhost:5005");
});
