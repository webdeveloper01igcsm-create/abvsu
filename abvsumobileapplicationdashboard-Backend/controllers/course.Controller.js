const CourseType = require("../models/CourseType");
const Stream = require("../models/Stream");
const Course = require("../models/Course");

const MONTHLY_ELIGIBLE_FALLBACK = /certification/i;

const isMonthlyEnabledCourseType = (courseType) =>
  Boolean(
    courseType?.supportsMonthlyDuration ||
    MONTHLY_ELIGIBLE_FALLBACK.test(courseType?.name || ""),
  );

const normalizeDuration = (duration = {}, courseType) => {
  const format = duration?.format;
  const value = Number(duration?.value);

  if (!["Year", "Semester", "Month"].includes(format)) {
    throw new Error("Invalid duration format");
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Duration value must be a positive integer");
  }

  if (format === "Month" && !isMonthlyEnabledCourseType(courseType)) {
    throw new Error(
      "Month duration is only allowed for certification course types",
    );
  }

  let inYears = value;

  if (format === "Semester") {
    inYears = Math.ceil(value / 2);
  }

  if (format === "Month") {
    // Keep whole-year span for legacy session-based flows.
    inYears = Math.max(1, Math.ceil(value / 12));
  }

  return {
    format,
    value,
    inYears,
  };
};

const validateStreams = async (hasStream, streams = []) => {
  if (!hasStream) {
    return [];
  }

  if (!Array.isArray(streams) || streams.length === 0) {
    throw new Error(
      "At least one stream is required when hasStream is enabled",
    );
  }

  const streamData = await Stream.find({ _id: { $in: streams } });
  if (streamData.length !== streams.length) {
    throw new Error("Invalid Stream IDs");
  }

  return streamData.map((stream) => stream._id);
};

const addCourse = async (req, res) => {
  try {
    const { name, courseTypeId, hasStream, duration, streams } = req.body;

    // Validate Course Type
    const courseType = await CourseType.findById(courseTypeId);
    if (!courseType) {
      return res.status(404).json({ error: "Invalid Course Type ID" });
    }

    const normalizedDuration = normalizeDuration(duration, courseType);
    const streamIds = await validateStreams(hasStream, streams);

    const course = new Course({
      name,
      courseTypeId,
      hasStream,
      duration: normalizedDuration,
      streams: streamIds,
    });
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const allCourses = async (req, res) => {
  const courses = await Course.find()
    .populate("courseTypeId")
    .populate("streams");
  res.json(courses);
};

const updateCourse = async (req, res) => {
  try {
    const existingCourse = await Course.findById(req.params.id);

    if (!existingCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    const updateData = { ...req.body };

    const courseTypeId = updateData.courseTypeId || existingCourse.courseTypeId;
    const courseType = await CourseType.findById(courseTypeId);

    if (!courseType) {
      return res.status(404).json({ error: "Invalid Course Type ID" });
    }

    const mergedDuration = {
      ...(existingCourse.duration?.toObject?.() || existingCourse.duration),
      ...(updateData.duration || {}),
    };

    updateData.duration = normalizeDuration(mergedDuration, courseType);

    const hasStream =
      updateData.hasStream === undefined
        ? existingCourse.hasStream
        : updateData.hasStream === true || updateData.hasStream === "true";

    updateData.hasStream = hasStream;

    if (hasStream) {
      const requestedStreams =
        updateData.streams !== undefined
          ? updateData.streams
          : existingCourse.streams;
      updateData.streams = await validateStreams(hasStream, requestedStreams);
    } else {
      updateData.streams = [];
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: "Failed to update course" });
  }
};

const deleteCourse = async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: "Course deleted" });
};

module.exports = { addCourse, allCourses, updateCourse, deleteCourse };
