const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getResult, getAllResults } = require('../controllers/resultController');

router.get('/', verifyToken, getAllResults);
router.get('/:attemptId', verifyToken, getResult);

module.exports = router;
