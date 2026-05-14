const express = require("express");
const router = express.Router();
const controller = require("../controllers/semesterSubject.Controller");
const { checkPermission, verifyToken } = require("../middlewares/auth");

router.post("/",verifyToken, checkPermission("Course Management", "write"), controller.addOrUpdateSemesterSubjects);
router.get("/",verifyToken, checkPermission("Course Management", "view"), controller.getAllSemesterSubjects);
router.get("/by-details",verifyToken, checkPermission("Course Management", "view"), controller.getSubjectsByDetails);
router.delete("/:id",verifyToken, checkPermission("Course Management", "delete"), controller.deleteSemesterSubject);

module.exports = router;
