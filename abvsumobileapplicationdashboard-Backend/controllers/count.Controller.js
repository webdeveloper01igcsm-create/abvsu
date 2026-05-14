const Student = require("../models/Student")
const Verification = require("../models/Verification")
const allStudents = async (req, res) => {
    try {
        const students = await Student.countDocuments();
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

const activeStudents = async (req, res) => {
    try {
        const students = await Student.countDocuments({
            "appRegisDetails.status": true,
        });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

const allvideoStudents = async (req, res) => {
    try {
        const students = await Verification.countDocuments();
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

const pendingForVerification = async (req, res) => {
    try {
        const students = await Verification.countDocuments({
            videoUrl: { $ne: "pending" },
            verificationStatus: "pending",
        });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

const videoPending = async (req, res) => {
    try {
        const students = await Verification.countDocuments({
            videoUrl: "pending",
        });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

module.exports = {
    allStudents,
    activeStudents,
    allvideoStudents,
    pendingForVerification,
    videoPending,
};