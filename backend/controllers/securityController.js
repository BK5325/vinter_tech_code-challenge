const SecurityEvent = require('../models/SecurityEvent');

const getSecurityEvents = async (req, res, next) => {
  try {
    const { attemptId, userId, eventType, severity, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (req.user.role === 'PARTICIPANT') {
      filter.userId = req.user._id;
    } else {
      if (userId) filter.userId = userId;
    }

    if (attemptId) filter.attemptId = attemptId;
    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .populate('userId', 'name email')
        .populate('challengeId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      SecurityEvent.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { events, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

const getSecurityStats = async (req, res, next) => {
  try {
    const stats = await SecurityEvent.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return res.status(200).json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};

module.exports = { getSecurityEvents, getSecurityStats };
