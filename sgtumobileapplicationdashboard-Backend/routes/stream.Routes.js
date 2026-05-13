const express = require('express');
const {
  addStream,
  getAllStreams,
  updateStream,
  deleteStream
} = require('../controllers/stream.Controller');
const { checkPermission, verifyToken } = require("../middlewares/auth");

const router = express.Router();

router.post('/',verifyToken, checkPermission("Course Management", "write"), addStream);
router.get('/',verifyToken, checkPermission("Course Management", "view"), getAllStreams);
router.put('/:id',verifyToken, checkPermission("Course Management", "update"), updateStream);
router.delete('/:id',verifyToken, checkPermission("Course Management", "delete"), deleteStream);

module.exports = router;
