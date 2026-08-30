const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getRankings, getChallengRankings } = require('../controllers/rankingController');

router.get('/', verifyToken, getRankings);
router.get('/challenges/:challengeId', verifyToken, getChallengRankings);

module.exports = router;
