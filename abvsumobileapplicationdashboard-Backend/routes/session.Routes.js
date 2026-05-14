const express = require('express');
const router = express.Router();
const {addSession, activeSession, updateSession,getSession, deleteSession} = require("../controllers/session.Controller");
const { checkPermission, checkRole } = require('../middlewares/auth');


// Add Session
router.post('/', checkPermission("Session Management", "write"), addSession);

// Get All Sessions
router.get('/',checkPermission("Session Management", "view"), getSession);

// Get Active Session
router.get('/active',checkPermission("Session Management", "view"), activeSession);

// Update Session
router.put('/:id',checkPermission("Session Management", "update"), updateSession);

// Delete Session
router.delete('/:id',checkPermission("Session Management", "delete"), deleteSession);

module.exports = router;