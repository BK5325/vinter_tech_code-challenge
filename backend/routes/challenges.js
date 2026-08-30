const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getChallenges, getChallengeById, createChallenge, updateChallenge,
  deleteChallenge, activateChallenge, deactivateChallenge,
  getChallengeQuestions, getChallengeQuestionsParticipant,
} = require('../controllers/challengeController');

router.get('/', verifyToken, getChallenges);
router.get('/:id', verifyToken, getChallengeById);
router.post('/', verifyToken, requireRole('ADMIN'), createChallenge);
router.patch('/:id', verifyToken, requireRole('ADMIN'), updateChallenge);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteChallenge);
router.post('/:id/activate', verifyToken, requireRole('ADMIN'), activateChallenge);
router.post('/:id/deactivate', verifyToken, requireRole('ADMIN'), deactivateChallenge);
router.get('/:id/questions', verifyToken, requireRole('ADMIN', 'STAFF'), getChallengeQuestions);
router.get('/:id/questions-participant', verifyToken, requireRole('PARTICIPANT'), getChallengeQuestionsParticipant);

module.exports = router;
