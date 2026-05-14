const Admission = require("../models/Admission.js");
const StudentMarks = require("../models/StudentMarks.js");

exports.updateExcelWithSerials = async (req, res) => {
  try {
    const enrollmentNumber = req.params.id;
    const admission = await Admission.findOne({ enrollmentNumber });
    if (!admission) {
      return res.status(404).json({ error: "Admission not found" });
    }
    // console.log(admission)
    const serialNumber = await StudentMarks.find({ admission: admission._id }).select("-_id serialNumber semester");
    // console.log(serialNumber)
    return res.status(200).json({ serialNumber });
  } catch (error) {
    // console.error("Error updating Excel file:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
