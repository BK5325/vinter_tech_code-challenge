const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getQuestions, getQuestionById, createQuestion,
  updateQuestion, deleteQuestion, duplicateQuestion,
} = require('../controllers/questionController');

router.get('/', verifyToken, requireRole('ADMIN', 'STAFF'), getQuestions);
router.get('/:id', verifyToken, requireRole('ADMIN', 'STAFF'), getQuestionById);
router.post('/', verifyToken, requireRole('ADMIN'), createQuestion);
router.patch('/:id', verifyToken, requireRole('ADMIN'), updateQuestion);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteQuestion);
router.post('/:id/duplicate', verifyToken, requireRole('ADMIN'), duplicateQuestion);

module.exports = router;
