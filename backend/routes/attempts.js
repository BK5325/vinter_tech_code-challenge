const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  startAttempt, getAttempt, saveAnswer, toggleReview,
  submitAttempt, logSecurityEvent, getAllAttempts,
} = require('../controllers/attemptController');

router.get('/', verifyToken, getAllAttempts);
router.post('/start', verifyToken, requireRole('PARTICIPANT'), startAttempt);
router.get('/:id', verifyToken, getAttempt);
router.post('/:id/answer', verifyToken, requireRole('PARTICIPANT'), saveAnswer);
router.post('/:id/review', verifyToken, requireRole('PARTICIPANT'), toggleReview);
router.post('/:id/submit', verifyToken, submitAttempt);
router.post('/:id/security-event', verifyToken, requireRole('PARTICIPANT'), logSecurityEvent);

module.exports = router;
