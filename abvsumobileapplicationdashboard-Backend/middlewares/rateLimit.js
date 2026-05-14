const rateLimit = require("express-rate-limit");

const getClientKey = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  return forwardedFor || rateLimit.ipKeyGenerator(req.ip || "unknown");
};

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: {
    success: false,
    message: "Too many OTP send requests. Please try again after 15 minutes.",
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Please try again after 15 minutes.",
  },
});

module.exports = {
  otpSendLimiter,
  otpVerifyLimiter,
};