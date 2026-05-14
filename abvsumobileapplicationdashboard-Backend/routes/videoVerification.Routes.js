const express = require("express");
const {
  UploadVideo,
  addStudent,
  editStudent,
  deleteStudent,
  getAllStudents,
  login,
  verify,
  UploadVideoByAdmin
} = require("../controllers/video.Controller.js");
const { verifyToken, checkRole, checkPermission } = require("../middlewares/auth");
const router = express.Router();

router.get("/all", verifyToken, getAllStudents);
router.post("/login", login)
router.get("/verify", verify)

router.post("/upload", UploadVideo);
router.post("/uploadadmin",verifyToken, checkPermission("Video Verification Management", "update"), UploadVideoByAdmin);

router.post("/add", verifyToken, checkPermission("Video Verification Management", "write"), addStudent);

router.put("/edit/:mobile", verifyToken, editStudent);

router.delete("/delete/:mobile", verifyToken, checkRole("admin"), deleteStudent);

module.exports = router;