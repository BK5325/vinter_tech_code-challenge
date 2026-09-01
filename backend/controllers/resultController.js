const Attempt = require('../models/Attempt');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Challenge = require('../models/Challenge');

// ─── Get Single Result ─────────────────────────────────────────────────────────
const getResult = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('userId', 'name email')
      .populate('challengeId');

    if (!attempt) return res.status(404).json({ success: false, message: 'Result not found.' });

    // Participants can only view their own results
    if (req.user.role === 'PARTICIPANT' && attempt.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!['SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status)) {
      return res.status(400).json({ success: false, message: 'This attempt has not been submitted yet.' });
    }

    const challenge = attempt.challengeId;

    // Respect visibility settings for participants
    const resultData = {
      attemptId: attempt._id,
      participant: attempt.userId,
      challenge: { _id: challenge._id, title: challenge.title },
      status: attempt.status,
      submissionReason: attempt.submissionReason,
      submittedAt: attempt.submittedAt,
      timeTaken: attempt.timeTaken,
      violationCount: attempt.violationCount,
    };

    // Score visibility
    if (req.user.role !== 'PARTICIPANT' || challenge.scoreVisibility === 'IMMEDIATE') {
      resultData.score = attempt.score;
      resultData.totalMarks = attempt.totalMarks;
      resultData.percentage = attempt.percentage;
      resultData.correctCount = attempt.correctCount;
      resultData.wrongCount = attempt.wrongCount;
      resultData.unansweredCount = attempt.unansweredCount;
    } else {
      resultData.scoreHidden = true;
    }

    // Correct answer visibility
    if (req.user.role !== 'PARTICIPANT' || challenge.correctAnswerVisibility === 'SHOW_AFTER_SUBMIT') {
      const answers = await Answer.find({ attemptId: attempt._id }).populate('questionId');
      resultData.answers = answers.map((a) => ({
        question: {
          _id: a.questionId._id,
          questionText: a.questionId.questionText,
          questionType: a.questionId.questionType,
          options: a.questionId.options,
          correctAnswer: a.questionId.correctAnswer,
          explanation: a.questionId.explanation,
          marks: a.questionId.marks,
        },
        answerData: a.answerData,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
        markedForReview: a.markedForReview,
      }));
    }

    // Rank visibility
    if (challenge.rankVisibility === 'SHOW' || req.user.role !== 'PARTICIPANT') {
      const betterAttempts = await Attempt.countDocuments({
        challengeId: challenge._id,
        status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        $or: [
          { score: { $gt: attempt.score } },
          { score: attempt.score, timeTaken: { $lt: attempt.timeTaken } },
        ],
      });
      resultData.rank = betterAttempts + 1;
    }

    return res.status(200).json({ success: true, data: { result: resultData } });
  } catch (error) { next(error); }
};

// ─── Get All Results (Admin/Staff) ────────────────────────────────────────────
const getAllResults = async (req, res, next) => {
  try {
    const { challengeId, page = 1, limit = 20 } = req.query;
    const filter = {
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
    };

    if (req.user.role === 'PARTICIPANT') {
      filter.userId = req.user._id;
    } else if (challengeId) {
      filter.challengeId = challengeId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [attempts, total] = await Promise.all([
      Attempt.find(filter)
        .populate('userId', 'name email institution course studentId')
        .populate('challengeId', 'title totalMarks scoreVisibility')
        .sort({ score: -1, timeTaken: 1 })
        .skip(skip).limit(parseInt(limit)),
      Attempt.countDocuments(filter),
    ]);

    const results = attempts.map(attempt => {
      const resultObj = attempt.toObject ? attempt.toObject() : attempt;
      if (req.user.role === 'PARTICIPANT' && resultObj.challengeId?.scoreVisibility !== 'IMMEDIATE') {
        delete resultObj.score;
        delete resultObj.percentage;
        delete resultObj.correctCount;
        delete resultObj.wrongCount;
        delete resultObj.unansweredCount;
        resultObj.scoreHidden = true;
      }
      return resultObj;
    });

    return res.status(200).json({
      success: true,
      data: { results, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

module.exports = { getResult, getAllResults };
