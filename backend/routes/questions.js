const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  bulkDeleteQuestions,
  deleteAllQuestions,
  bulkImportQuestions,
  getCategories,
} = require('../controllers/questionController');

// Specific endpoints (must precede /:id)
router.get('/categories', verifyToken, requireRole('ADMIN', 'STAFF'), getCategories);
router.post('/bulk-delete', verifyToken, requireRole('ADMIN'), bulkDeleteQuestions);
router.post('/delete-all', verifyToken, requireRole('ADMIN'), deleteAllQuestions);
router.post('/bulk-import', verifyToken, requireRole('ADMIN'), bulkImportQuestions);

// Standard CRUD endpoints
router.get('/', verifyToken, requireRole('ADMIN', 'STAFF'), getQuestions);
router.get('/:id', verifyToken, requireRole('ADMIN', 'STAFF'), getQuestionById);
router.post('/', verifyToken, requireRole('ADMIN'), createQuestion);
router.patch('/:id', verifyToken, requireRole('ADMIN'), updateQuestion);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteQuestion);
router.post('/:id/duplicate', verifyToken, requireRole('ADMIN'), duplicateQuestion);

module.exports = router;
