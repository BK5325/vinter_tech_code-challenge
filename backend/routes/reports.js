const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getResultsReport, exportCSV, exportXLSX, getSecurityReport, getParticipantReport } = require('../controllers/reportController');

router.get('/results', verifyToken, requireRole('ADMIN', 'STAFF'), getResultsReport);
router.get('/participants', verifyToken, requireRole('ADMIN', 'STAFF'), getParticipantReport);
router.get('/security', verifyToken, requireRole('ADMIN', 'STAFF'), getSecurityReport);
router.get('/export/csv', verifyToken, requireRole('ADMIN', 'STAFF'), exportCSV);
router.get('/export/xlsx', verifyToken, requireRole('ADMIN', 'STAFF'), exportXLSX);

module.exports = router;
