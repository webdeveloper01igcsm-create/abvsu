const express = require("express");
const router = express.Router();
const studentMarksController = require("../controllers/marks.Controller");
const { checkPermission, verifyToken } = require("../middlewares/auth");

// Get filtered Students
router.post("/getStudent",verifyToken, checkPermission("Result Management", "view"), studentMarksController.getfilteredStudent);

// Add Single Student Marks NO
router.post("/add",verifyToken, checkPermission("Result Management", "write"), studentMarksController.addSingleStudentMarks);

// Add Multiple Student Marks
router.post("/add-multiple",verifyToken, checkPermission("Result Management", "write"), studentMarksController.addMultipleStudentMarks);

// Edit Student Marks by ID
router.put("/edit/:id",verifyToken, checkPermission("Result Management", "write"), studentMarksController.editStudentMarks);

// Delete Student Marks by ID
router.delete("/delete/:id",verifyToken, checkPermission("Result Management", "write"), studentMarksController.deleteStudentMarks);

// Get All Student Marks
router.get("/all",verifyToken, checkPermission("Result Management", "view"), studentMarksController.getAllStudentMarks);

// Get Single Student Marks by ID
router.get("/:id",verifyToken, checkPermission("Result Management", "view"), studentMarksController.getSingleStudentMarks);

module.exports = router;