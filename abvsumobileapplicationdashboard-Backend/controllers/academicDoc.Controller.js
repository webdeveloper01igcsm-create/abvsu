const AcademicDoc = require('../models/AcademicDoc');

// CREATE
exports.createDoc = async (req, res) => {
  try {
    const { name, description, fee, isActive } = req.body;
    const newDoc = new AcademicDoc({ name, description, fee, isActive });
    await newDoc.save();
    res.status(201).json(newDoc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ALL
exports.getDocs = async (req, res) => {
  try {
    const docs = await AcademicDoc.find({isActive: true});
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ SINGLE
exports.getDoc = async (req, res) => {
  try {
    const doc = await AcademicDoc.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateDoc = async (req, res) => {
  try {
    const { name, description, fee, isActive } = req.body;
    const updatedDoc = await AcademicDoc.findByIdAndUpdate(
      req.params.id,
      { name, description, fee, isActive },
      { new: true }
    );
    if (!updatedDoc) return res.status(404).json({ message: "Document not found" });
    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
exports.deleteDoc = async (req, res) => {
  try {
    const deletedDoc = await AcademicDoc.findByIdAndDelete(req.params.id);
    if (!deletedDoc) return res.status(404).json({ message: "Document not found" });
    res.status(200).json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};