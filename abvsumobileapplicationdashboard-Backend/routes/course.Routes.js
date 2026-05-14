const express = require('express');
const {addCourse,allCourses,updateCourse,deleteCourse} = require('../controllers/course.Controller')
const router = express.Router();
const { checkPermission } = require("../middlewares/auth");

// Add Course
router.post('/',checkPermission("Course Management", "write"), addCourse);

// Get All Courses
router.get('/',checkPermission("Course Management", "view"), allCourses);

// Update Course
router.put('/:id',checkPermission("Course Management", "update"), updateCourse);

// Delete Course
router.delete('/:id',checkPermission("Course Management", "delete"), deleteCourse );

module.exports = router;