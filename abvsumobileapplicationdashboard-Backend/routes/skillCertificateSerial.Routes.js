const express = require('express');
const {
  setSkillCertificateSeries,
  getAllSkillCertificateSeries,
  getSkillCertificateSeriesById,
  updateSkillCertificateSeries,
  deleteSkillCertificateSeries,
} = require('../controllers/skillCertificateSerial.Controller');
const { verifyToken, checkPermission } = require('../middlewares/auth');

const router = express.Router();

router.post('/serial-series', verifyToken, checkPermission('Certificate Management', 'write'), setSkillCertificateSeries);
router.get('/serial-series', verifyToken, checkPermission('Certificate Management', 'view'), getAllSkillCertificateSeries);
router.get('/serial-series/:id', verifyToken, checkPermission('Certificate Management', 'view'), getSkillCertificateSeriesById);
router.put('/serial-series/:id', verifyToken, checkPermission('Certificate Management', 'update'), updateSkillCertificateSeries);
router.delete('/serial-series/:id', verifyToken, checkPermission('Certificate Management', 'delete'), deleteSkillCertificateSeries);

module.exports = router;