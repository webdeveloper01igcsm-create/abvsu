const SerialCounter = require("../models/SerialCounter");

//  Create or Upsert
exports.setSerialSeries = async (req, res) => {
  try {
    const {
      courseId = req.body.course,
      streamId = req.body.stream || null,
      semester,
      prefix,
      lastNumber,
    } = req.body;

    const errors = [];

    if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
      errors.push("courseId is missing or invalid");
    }

    if (
      semester === undefined ||
      semester === null ||
      typeof semester !== "number"
    ) {
      errors.push("semester is missing or invalid");
    }

    if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
      errors.push("prefix is missing or invalid");
    }

    if (typeof lastNumber !== "string") {
      errors.push("lastNumber is missing or invalid");
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ message: "Missing or invalid fields", errors });
    }

    const query = { course: courseId, semester, stream: streamId || null };
    const update = { prefix, lastNumber };
    const options = { new: true, upsert: true };

    const result = await SerialCounter.findOneAndUpdate(query, update, options);

    res.status(200).json({
      message: "Serial series set successfully.",
      data: result,
    });
  } catch (err) {
    console.error("Error setting serial series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Get All
exports.getAllSerialSeries = async (req, res) => {
  try {
    const list = await SerialCounter.find()
      .populate("course", "name")
      .populate("stream", "name")
      .sort({ course: 1, semester: 1 });

    res.status(200).json({ count: list.length, data: list });
  } catch (err) {
    console.error("Error fetching series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Get by ID
exports.getSerialSeriesById = async (req, res) => {
  try {
    const id = req.params.id;
    const entry = await SerialCounter.findById(id)
      .populate("course", "name")
      .populate("stream", "name");

    if (!entry) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ data: entry });
  } catch (err) {
    console.error("Error getting serial series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Update
exports.updateSerialSeries = async (req, res) => {
  try {
    const id = req.params.id;
    const { prefix, lastNumber } = req.body;

    const updated = await SerialCounter.findByIdAndUpdate(
      id,
      { prefix, lastNumber },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Delete
exports.deleteSerialSeries = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await SerialCounter.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
