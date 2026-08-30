const Attempt = require('../models/Attempt');

const getRankings = async (req, res, next) => {
  try {
    const { challengeId, page = 1, limit = 50 } = req.query;
    const filter = { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } };
    if (challengeId) filter.challengeId = challengeId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [attempts, total] = await Promise.all([
      Attempt.find(filter)
        .populate('userId', 'name email institution course studentId')
        .populate('challengeId', 'title totalMarks rankVisibility')
        .sort({ score: -1, correctCount: -1, timeTaken: 1 })
        .skip(skip).limit(parseInt(limit)),
      Attempt.countDocuments(filter),
    ]);

    const rankings = attempts.map((a, idx) => ({
      rank: skip + idx + 1,
      participant: { name: a.userId?.name, email: a.userId?.email, institution: a.userId?.institution },
      challenge: { title: a.challengeId?.title, totalMarks: a.challengeId?.totalMarks },
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.percentage,
      correctCount: a.correctCount,
      timeTaken: a.timeTaken,
      submissionReason: a.submissionReason,
      attemptId: a._id,
    }));

    return res.status(200).json({
      success: true,
      data: { rankings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

const getChallengRankings = async (req, res, next) => {
  req.query.challengeId = req.params.challengeId;
  return getRankings(req, res, next);
};

module.exports = { getRankings, getChallengRankings };
