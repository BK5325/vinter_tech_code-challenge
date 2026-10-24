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
      challenge: { _id: challenge?._id, title: challenge?.title || 'Unknown Challenge' },
      status: attempt.status,
      submissionReason: attempt.submissionReason,
      submittedAt: attempt.submittedAt,
      timeTaken: attempt.timeTaken,
      violationCount: attempt.violationCount,
    };

    // Score visibility
    if (req.user.role !== 'PARTICIPANT' || challenge?.scoreVisibility === 'IMMEDIATE') {
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
    if (req.user.role !== 'PARTICIPANT' || challenge?.correctAnswerVisibility === 'SHOW_AFTER_SUBMIT') {
      const answers = await Answer.find({ attemptId: attempt._id }).populate('questionId');
      resultData.answers = answers.map((a) => {
        const q = a.questionId || {
          _id: a._id,
          questionText: '[Question deleted]',
          questionType: 'SHORT_ANSWER',
          options: [],
          correctAnswer: '',
          marks: a.marksAwarded || 0,
        };
        return {
          _id: a._id,
          question: {
            _id: q._id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            marks: q.marks,
          },
          answerData: a.answerData,
          isCorrect: a.isCorrect,
          marksAwarded: a.marksAwarded,
          markedForReview: a.markedForReview,
          evaluationStatus: a.evaluationStatus,
          evaluatorFeedback: a.evaluatorFeedback,
        };
      });
    }

    // Rank visibility
    if (challenge && (challenge.rankVisibility === 'SHOW' || req.user.role !== 'PARTICIPANT')) {
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

// ─── Manual Evaluation for Descriptive Answers ────────────────────────────────
const evaluateAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const { marksAwarded, feedback = '' } = req.body;

    const answer = await Answer.findById(answerId).populate('questionId');
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found.' });
    }

    const question = answer.questionId;
    if (!question) {
      return res.status(404).json({ success: false, message: 'Associated question not found.' });
    }

    const parsedMarks = parseFloat(marksAwarded);
    if (isNaN(parsedMarks) || parsedMarks < 0) {
      return res.status(400).json({ success: false, message: 'Marks awarded must be a non-negative number.' });
    }

    if (parsedMarks > question.marks) {
      return res.status(400).json({
        success: false,
        message: `Marks awarded (${parsedMarks}) cannot exceed maximum marks for this question (${question.marks}).`,
      });
    }

    answer.marksAwarded = parsedMarks;
    answer.isCorrect = parsedMarks > 0;
    answer.evaluatorFeedback = String(feedback || '').trim();
    answer.evaluationStatus = 'EVALUATED';
    answer.evaluatedBy = req.user._id;
    answer.evaluatedAt = new Date();
    await answer.save();

    // Recalculate attempt score
    const attempt = await Attempt.findById(answer.attemptId);
    if (attempt) {
      const allAnswers = await Answer.find({ attemptId: attempt._id });
      let newScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;

      for (const a of allAnswers) {
        newScore += (a.marksAwarded || 0);
        if (a.isCorrect === true) correctCount++;
        else if (a.isCorrect === false) wrongCount++;
        else unansweredCount++;
      }

      attempt.score = newScore;
      attempt.correctCount = correctCount;
      attempt.wrongCount = wrongCount;
      attempt.unansweredCount = unansweredCount;
      attempt.percentage = attempt.totalMarks > 0 ? Math.round((newScore / attempt.totalMarks) * 100 * 100) / 100 : 0;
      await attempt.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Evaluation saved successfully.',
      data: { answer, attempt },
    });
  } catch (error) { next(error); }
};

module.exports = { getResult, getAllResults, evaluateAnswer };
