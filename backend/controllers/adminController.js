const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Attempt = require('../models/Attempt');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');
const RoleChangeLog = require('../models/RoleChangeLog');

// ─── Admin Dashboard Overview ─────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalParticipants, totalStaff, totalAdmins,
      activeChallenges, completedChallenges,
      totalAttempts, activeAttempts,
      recentSecurity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'PARTICIPANT' }),
      User.countDocuments({ role: 'STAFF' }),
      User.countDocuments({ role: 'ADMIN' }),
      Challenge.countDocuments({ status: 'ACTIVE' }),
      Challenge.countDocuments({ status: { $in: ['COMPLETED', 'ARCHIVED'] } }),
      Attempt.countDocuments({ status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } }),
      Attempt.countDocuments({ status: 'IN_PROGRESS' }),
      SecurityEvent.find({ severity: { $in: ['MEDIUM', 'HIGH'] } })
        .sort({ createdAt: -1 }).limit(10)
        .populate('userId', 'name email')
        .populate('challengeId', 'title'),
    ]);

    // Average and highest score
    const scoreStats = await Attempt.aggregate([
      { $match: { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }, totalMarks: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          highestScore: { $max: '$score' },
          highestPercentage: { $max: '$percentage' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, participants: totalParticipants, staff: totalStaff, admins: totalAdmins },
        challenges: { active: activeChallenges, completed: completedChallenges },
        attempts: { total: totalAttempts, active: activeAttempts },
        scores: scoreStats[0] || { avgPercentage: 0, highestScore: 0, highestPercentage: 0 },
        recentSecurityEvents: recentSecurity,
      },
    });
  } catch (error) { next(error); }
};

// ─── Get Audit Logs ───────────────────────────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, userId, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// ─── Get Role Change Logs ─────────────────────────────────────────────────────
const getRoleChangeLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      RoleChangeLog.find()
        .populate('userId', 'name email')
        .populate('changedBy', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      RoleChangeLog.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: { logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// ─── Reset Attempt (Admin) ────────────────────────────────────────────────────
const resetAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    await Attempt.findByIdAndDelete(attempt._id);
    const Answer = require('../models/Answer');
    await Answer.deleteMany({ attemptId: attempt._id });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'ATTEMPT_RESET',
      description: `Attempt reset: ${attempt._id}`,
      relatedEntityId: attempt._id, relatedEntityType: 'Attempt', ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Attempt reset. Participant can retake the challenge.' });
  } catch (error) { next(error); }
};

module.exports = { getDashboardStats, getAuditLogs, getRoleChangeLogs, resetAttempt };
