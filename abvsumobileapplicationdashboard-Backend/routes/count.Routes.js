const express = require("express");
const router = express.Router();
const {
  allStudents,
  activeStudents,
  allvideoStudents,
  pendingForVerification,
  videoPending,
} = require("../controllers/count.Controller");
const { checkPermission } = require("../middlewares/auth");

router.get("/students",checkPermission("Count Management", "view"), allStudents);
router.get("/activestudents",checkPermission("Count Management", "view"), activeStudents);
router.get("/videoStudents",checkPermission("Count Management", "view"), allvideoStudents);
router.get("/pendingStudents",checkPermission("Count Management", "view"), pendingForVerification);
router.get("/videoPending",checkPermission("Count Management", "view"), videoPending);

module.exports = router;