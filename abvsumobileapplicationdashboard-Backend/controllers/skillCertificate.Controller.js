const Admission = require('../models/Admission');
const SkillCertificate = require('../models/SkillCertificate');
const SkillCertificateType = require('../models/SkillCertificateType');
const { getNextSkillCertificateSerialNumber } = require('../utils/getNextSkillCertificateSerialNumber');
const {
  previewSkillCertificate: buildSkillCertificatePreviewPdf,
  printSkillCertificate: buildSkillCertificatePrintPdf,
} = require('../utils/Generator/skillCertificatePdf');

const certificatePopulate = [
  {
    path: 'admission',
    select: 'enrollmentNumber student course stream session',
    populate: [
      { path: 'student', select: 'name fatherName' },
      { path: 'course', select: 'name duration hasStream' },
      { path: 'stream', select: 'name' },
      { path: 'session', select: 'session year' },
    ],
  },
  {
    path: 'certificateType',
    select: 'name description isActive',
  },
];

const formatIssueDate = (dateValue) => {
  if (!dateValue) {
    return 'N/A';
  }

  return new Date(dateValue).toLocaleDateString('en-GB').replace(/\//g, '-');
};

const getDurationMonths = (course) => {
  if (!course?.duration) {
    return 0;
  }

  if (course.duration.format === 'Month') {
    return course.duration.value;
  }

  return (course.duration.inYears || 0) * 12;
};

const buildPdfData = (certificate) => ({
  serialNumber: certificate.serialNumber,
  dateOfIssue: formatIssueDate(certificate.issueDate),
  studentName: certificate.admission?.student?.name,
  enrollmentNo: certificate.admission?.enrollmentNumber,
  course: certificate.admission?.course?.name,
  streamName: certificate.admission?.stream?.name || '',
  sessionName: certificate.admission?.session?.session || '',
  durationMonths: getDurationMonths(certificate.admission?.course),
});

const getAdmissionQuery = ({ admissionId, enrollmentNumber }) => {
  if (admissionId) {
    return { _id: admissionId };
  }

  if (enrollmentNumber) {
    return { enrollmentNumber };
  }

  return null;
};

exports.createSkillCertificate = async (req, res) => {
  try {
    const { admissionId, enrollmentNumber, certificateTypeId, remarks = '' } = req.body;

    if (!certificateTypeId) {
      return res.status(400).json({ error: 'certificateTypeId is required' });
    }

    const admissionQuery = getAdmissionQuery({ admissionId, enrollmentNumber });
    if (!admissionQuery) {
      return res.status(400).json({ error: 'admissionId or enrollmentNumber is required' });
    }

    const [admission, certificateType] = await Promise.all([
      Admission.findOne(admissionQuery),
      SkillCertificateType.findById(certificateTypeId),
    ]);

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (!certificateType) {
      return res.status(404).json({ error: 'Certificate type not found' });
    }

    const certificate = await SkillCertificate.create({
      admission: admission._id,
      certificateType: certificateType._id,
      remarks,
    });

    const populated = await SkillCertificate.findById(certificate._id).populate(certificatePopulate);
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'A certificate record already exists for this enrollment and certificate type',
      });
    }

    res.status(400).json({ error: error.message });
  }
};

exports.getSkillCertificates = async (req, res) => {
  try {
    const certificates = await SkillCertificate.find()
      .populate(certificatePopulate)
      .sort({ createdAt: -1 });

    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

exports.getSkillCertificate = async (req, res) => {
  try {
    const certificate = await SkillCertificate.findById(req.params.id).populate(certificatePopulate);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.status(200).json(certificate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
};

exports.generateSkillCertificate = async (req, res) => {
  try {
    const { issueDate } = req.body;
    if (!issueDate) {
      return res.status(400).json({ error: 'issueDate is required' });
    }

    const certificate = await SkillCertificate.findById(req.params.id).populate(certificatePopulate);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.status === 'generated' && certificate.serialNumber) {
      return res.status(200).json({
        success: true,
        alreadyGenerated: true,
        message: 'Certificate already generated',
        data: certificate,
      });
    }

    const serialNumber = await getNextSkillCertificateSerialNumber({
      sessionId: certificate.admission.session?._id,
      courseId: certificate.admission.course?._id,
      certificateTypeId: certificate.certificateType?._id,
      streamId: certificate.admission.stream?._id || null,
    });

    certificate.serialNumber = serialNumber;
    certificate.issueDate = new Date(issueDate);
    certificate.status = 'generated';
    certificate.generatedAt = new Date();
    await certificate.save();

    const populated = await SkillCertificate.findById(certificate._id).populate(certificatePopulate);

    res.status(200).json({
      success: true,
      message: 'Certificate generated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to generate certificate' });
  }
};

exports.previewSkillCertificate = async (req, res) => {
  try {
    const certificate = await SkillCertificate.findById(req.params.id).populate(certificatePopulate);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.status !== 'generated' || !certificate.serialNumber) {
      return res.status(400).json({ error: 'Generate the certificate before previewing it' });
    }

    const pdfBytes = await buildSkillCertificatePreviewPdf(buildPdfData(certificate));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=Skill_Certificate_Preview_${certificate.serialNumber}.pdf`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to preview certificate' });
  }
};

exports.printSkillCertificate = async (req, res) => {
  try {
    const certificate = await SkillCertificate.findById(req.params.id).populate(certificatePopulate);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.status !== 'generated' || !certificate.serialNumber) {
      return res.status(400).json({ error: 'Generate the certificate before printing it' });
    }

    const pdfBytes = await buildSkillCertificatePrintPdf(buildPdfData(certificate));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Skill_Certificate_${certificate.serialNumber}.pdf`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to print certificate' });
  }
};

exports.deleteSkillCertificate = async (req, res) => {
  try {
    const certificate = await SkillCertificate.findByIdAndDelete(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.status(200).json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
};