const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getResult, getAllResults, evaluateAnswer } = require('../controllers/resultController');

router.get('/', verifyToken, getAllResults);
router.get('/:attemptId', verifyToken, getResult);
router.post('/answers/:answerId/evaluate', verifyToken, requireRole('ADMIN', 'STAFF'), evaluateAnswer);

module.exports = router;
