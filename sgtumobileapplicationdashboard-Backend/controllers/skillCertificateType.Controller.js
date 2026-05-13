const SkillCertificateType = require('../models/SkillCertificateType');

exports.createSkillCertificateType = async (req, res) => {
  try {
    const certificateType = await SkillCertificateType.create(req.body);
    res.status(201).json(certificateType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSkillCertificateTypes = async (req, res) => {
  try {
    const certificateTypes = await SkillCertificateType.find().sort({ name: 1 });
    res.status(200).json(certificateTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certificate types' });
  }
};

exports.getSkillCertificateType = async (req, res) => {
  try {
    const certificateType = await SkillCertificateType.findById(req.params.id);
    if (!certificateType) {
      return res.status(404).json({ error: 'Certificate type not found' });
    }

    res.status(200).json(certificateType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certificate type' });
  }
};

exports.updateSkillCertificateType = async (req, res) => {
  try {
    const certificateType = await SkillCertificateType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!certificateType) {
      return res.status(404).json({ error: 'Certificate type not found' });
    }

    res.status(200).json(certificateType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSkillCertificateType = async (req, res) => {
  try {
    const certificateType = await SkillCertificateType.findByIdAndDelete(req.params.id);
    if (!certificateType) {
      return res.status(404).json({ error: 'Certificate type not found' });
    }

    res.status(200).json({ message: 'Certificate type deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete certificate type' });
  }
};