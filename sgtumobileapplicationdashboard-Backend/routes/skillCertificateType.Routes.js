const express = require('express');
const {
  createSkillCertificateType,
  getSkillCertificateTypes,
  getSkillCertificateType,
  updateSkillCertificateType,
  deleteSkillCertificateType,
} = require('../controllers/skillCertificateType.Controller');
const { verifyToken, checkPermission } = require('../middlewares/auth');

const router = express.Router();

router.post('/', verifyToken, checkPermission('Certificate Management', 'write'), createSkillCertificateType);
router.get('/', verifyToken, checkPermission('Certificate Management', 'view'), getSkillCertificateTypes);
router.get('/:id', verifyToken, checkPermission('Certificate Management', 'view'), getSkillCertificateType);
router.put('/:id', verifyToken, checkPermission('Certificate Management', 'update'), updateSkillCertificateType);
router.delete('/:id', verifyToken, checkPermission('Certificate Management', 'delete'), deleteSkillCertificateType);

module.exports = router;