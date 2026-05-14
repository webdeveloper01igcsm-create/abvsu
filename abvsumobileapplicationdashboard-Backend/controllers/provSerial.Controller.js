const ProvisionalCounter = require("../models/ProvSerial");

// 🔹 Create or Upsert
exports.setSerialSeries = async (req, res) => {
  try {
    const {
      sessionId = req.body.session,
      courseId = req.body.course,
      streamId = req.body.stream || null,
      academicDocId = req.body.academicDoc,
      prefix,
      lastNumber
    } = req.body;

    const errors = [];
    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      errors.push("sessionId is missing or invalid");
    }

    if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
      errors.push("courseId is missing or invalid");
    }

    if (!academicDocId || typeof academicDocId !== "string" || academicDocId.trim() === "") {
      errors.push("academicDocId is missing or invalid");
    }

    if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
      errors.push("prefix is missing or invalid");
    }

    if (typeof lastNumber !== "string" || lastNumber.trim() === "") {
      errors.push("lastNumber is missing or invalid");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: "Missing or invalid fields", errors });
    }

    const query = { session: sessionId, course: courseId, academicDoc: academicDocId, stream: streamId || null };
    const update = { prefix, lastNumber };
    const options = { new: true, upsert: true };

    const result = await ProvisionalCounter.findOneAndUpdate(query, update, options);

    res.status(200).json({
      message: "Provisional serial series set successfully.",
      data: result
    });
  } catch (err) {
    console.error("Error setting provisional serial series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔹 Get All
exports.getAllSerialSeries = async (req, res) => {
  try {
    const list = await ProvisionalCounter.find()
      .populate("session", "session")
      .populate("course", "name")
      .populate("stream", "name")
      .populate("academicDoc", "name")
      .sort({ course: 1, academicDoc: 1 });

    res.status(200).json({ count: list.length, data: list });
  } catch (err) {
    console.error("Error fetching series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔹 Get by ID
exports.getSerialSeriesById = async (req, res) => {
  try {
    const id = req.params.id;
    const entry = await ProvisionalCounter.findById(id)
      .populate("course", "name")
      .populate("stream", "name")
      .populate("academicDoc", "name");

    if (!entry) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ data: entry });
  } catch (err) {
    console.error("Error getting provisional serial series:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔹 Update
exports.updateSerialSeries = async (req, res) => {
  try {
    const id = req.params.id;
    const { prefix, lastNumber } = req.body;

    const updated = await ProvisionalCounter.findByIdAndUpdate(
      id,
      { prefix, lastNumber },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔹 Delete
exports.deleteSerialSeries = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await ProvisionalCounter.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Not found." });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
