const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getDashboardStats, getAuditLogs, getRoleChangeLogs, resetAttempt } = require('../controllers/adminController');

router.get('/dashboard', verifyToken, requireRole('ADMIN', 'STAFF'), getDashboardStats);
router.get('/audit-logs', verifyToken, requireRole('ADMIN'), getAuditLogs);
router.get('/role-change-logs', verifyToken, requireRole('ADMIN'), getRoleChangeLogs);
router.post('/attempts/:id/reset', verifyToken, requireRole('ADMIN'), resetAttempt);

module.exports = router;
