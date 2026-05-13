const express = require("express");
const router = express.Router();
const {
  login,
  resetpassword,
  verifyOtp,
} = require("../controllers/auth.Controller");
const { verifyToken } = require("../middlewares/auth");

router.put("/update-password", verifyToken, resetpassword);
router.post("/login", login); 
router.post("/otp", verifyOtp)

module.exports = router;