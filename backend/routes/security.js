const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getSecurityEvents, getSecurityStats } = require('../controllers/securityController');

router.get('/', verifyToken, requireRole('ADMIN', 'STAFF'), getSecurityEvents);
router.get('/stats', verifyToken, requireRole('ADMIN', 'STAFF'), getSecurityStats);

module.exports = router;
