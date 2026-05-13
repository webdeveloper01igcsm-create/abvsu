const express = require('express');
const {
  createSkillCertificate,
  getSkillCertificates,
  getSkillCertificate,
  generateSkillCertificate,
  previewSkillCertificate,
  printSkillCertificate,
  deleteSkillCertificate,
} = require('../controllers/skillCertificate.Controller');
const { verifyToken, checkPermission } = require('../middlewares/auth');

const router = express.Router();

router.post('/', verifyToken, checkPermission('Certificate Management', 'write'), createSkillCertificate);
router.get('/', verifyToken, checkPermission('Certificate Management', 'view'), getSkillCertificates);
router.get('/:id', verifyToken, checkPermission('Certificate Management', 'view'), getSkillCertificate);
router.post('/:id/generate', verifyToken, checkPermission('Certificate Management', 'update'), generateSkillCertificate);
router.get('/:id/preview', verifyToken, checkPermission('Certificate Management', 'view'), previewSkillCertificate);
router.get('/:id/print', verifyToken, checkPermission('Certificate Management', 'view'), printSkillCertificate);
router.delete('/:id', verifyToken, checkPermission('Certificate Management', 'delete'), deleteSkillCertificate);

module.exports = router;