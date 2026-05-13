const CourseType = require("../models/CourseType");

const normalizeCourseTypePayload = (payload = {}) => ({
  name: payload.name,
  supportsMonthlyDuration:
    payload.supportsMonthlyDuration === true ||
    payload.supportsMonthlyDuration === "true",
});

const addCourseType = async (req, res) => {
  try {
    const courseType = new CourseType(normalizeCourseTypePayload(req.body));
    await courseType.save();
    res.status(201).json(courseType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const allCourseType = async (req, res) => {
  const courseTypes = await CourseType.find();
  res.json(courseTypes);
};

const updateCourseType = async (req, res) => {
  try {
    const courseType = await CourseType.findByIdAndUpdate(
      req.params.id,
      normalizeCourseTypePayload(req.body),
      { new: true, runValidators: true },
    );
    res.json(courseType);
  } catch (error) {
    res.status(404).json({ error: "Course Type not found" });
  }
};

const deleteCourseType = async (req, res) => {
  await CourseType.findByIdAndDelete(req.params.id);
  res.json({ message: "Course Type deleted" });
};

module.exports = {
  addCourseType,
  allCourseType,
  updateCourseType,
  deleteCourseType,
};
