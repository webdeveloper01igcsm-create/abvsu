const express = require('express');
const router = express.Router();
const {addCourseType, allCourseType, updateCourseType,deleteCourseType } = require("../controllers/courseType.Controller")
const { checkPermission } = require("../middlewares/auth");

// Add Course Type
router.post('/',checkPermission("Course Type Management", "write"), addCourseType);

// Get All Course Types
router.get('/',checkPermission("Course Type Management", "view"), allCourseType);

// Update Course Type
router.put('/:id',checkPermission("Course Type Management", "update"), updateCourseType);

// Delete Course Type
router.delete('/:id',checkPermission("Course Type Management", "delete"), deleteCourseType);

module.exports = router;