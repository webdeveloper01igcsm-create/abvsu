const SkillCertificateSerial = require('../models/SkillCertificateSerial');

exports.setSkillCertificateSeries = async (req, res) => {
  try {
    const {
      sessionId = req.body.session,
      courseId = req.body.course,
      streamId = req.body.stream || null,
      certificateTypeId = req.body.certificateType,
      prefix,
      lastNumber,
    } = req.body;

    const errors = [];

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      errors.push('sessionId is missing or invalid');
    }

    if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
      errors.push('courseId is missing or invalid');
    }

    if (!certificateTypeId || typeof certificateTypeId !== 'string' || certificateTypeId.trim() === '') {
      errors.push('certificateTypeId is missing or invalid');
    }

    if (!prefix || typeof prefix !== 'string' || prefix.trim() === '') {
      errors.push('prefix is missing or invalid');
    }

    if (typeof lastNumber !== 'string' || lastNumber.trim() === '') {
      errors.push('lastNumber is missing or invalid');
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Missing or invalid fields', errors });
    }

    const query = {
      session: sessionId,
      course: courseId,
      stream: streamId || null,
      certificateType: certificateTypeId,
    };

    const result = await SkillCertificateSerial.findOneAndUpdate(
      query,
      { prefix, lastNumber },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Skill certificate serial series set successfully.',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllSkillCertificateSeries = async (req, res) => {
  try {
    const list = await SkillCertificateSerial.find()
      .populate('session', 'session')
      .populate('course', 'name')
      .populate('stream', 'name')
      .populate('certificateType', 'name')
      .sort({ course: 1, certificateType: 1 });

    res.status(200).json({ count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getSkillCertificateSeriesById = async (req, res) => {
  try {
    const entry = await SkillCertificateSerial.findById(req.params.id)
      .populate('session', 'session')
      .populate('course', 'name')
      .populate('stream', 'name')
      .populate('certificateType', 'name');

    if (!entry) {
      return res.status(404).json({ message: 'Not found.' });
    }

    res.status(200).json({ data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateSkillCertificateSeries = async (req, res) => {
  try {
    const updated = await SkillCertificateSerial.findByIdAndUpdate(
      req.params.id,
      {
        prefix: req.body.prefix,
        lastNumber: req.body.lastNumber,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Not found.' });
    }

    res.status(200).json({ message: 'Updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteSkillCertificateSeries = async (req, res) => {
  try {
    const deleted = await SkillCertificateSerial.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Not found.' });
    }

    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};