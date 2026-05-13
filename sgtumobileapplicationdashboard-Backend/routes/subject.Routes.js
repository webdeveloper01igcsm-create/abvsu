const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.Controller");
const { checkPermission,verifyToken, checkRole } = require('../middlewares/auth');

// Add routes
router.post("/",verifyToken, checkPermission("Course Management", "write"), subjectController.addSubject);
router.get("/",verifyToken, checkPermission("Course Management", "view"), subjectController.getAllSubjects);
router.put("/:id",verifyToken, checkPermission("Course Management", "update"), subjectController.updateSubject);
router.delete("/:id",verifyToken, checkPermission("Course Management", "delete"), subjectController.deleteSubject);

module.exports = router;