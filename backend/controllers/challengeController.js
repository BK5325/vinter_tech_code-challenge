const Challenge = require('../models/Challenge');
const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');

// ─── Get Challenges ───────────────────────────────────────────────────────────
const getChallenges = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Participants only see ACTIVE challenges
    if (req.user.role === 'PARTICIPANT') {
      filter.status = 'ACTIVE';
    } else if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [challenges, total] = await Promise.all([
      Challenge.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Challenge.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { challenges, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Challenge ─────────────────────────────────────────────────────
const getChallengeById = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id).populate('createdBy', 'name email');
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    // Participants can only view ACTIVE challenges
    if (req.user.role === 'PARTICIPANT' && challenge.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    return res.status(200).json({ success: true, data: { challenge } });
  } catch (error) {
    next(error);
  }
};

// ─── Create Challenge ─────────────────────────────────────────────────────────
const createChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.create({ ...req.body, createdBy: req.user._id });

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CHALLENGE_CREATE',
      description: `Challenge created: ${challenge.title}`,
      relatedEntityId: challenge._id,
      relatedEntityType: 'Challenge',
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: { challenge }, message: 'Challenge created.' });
  } catch (error) {
    next(error);
  }
};

// ─── Update Challenge ─────────────────────────────────────────────────────────
const updateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CHALLENGE_UPDATE',
      description: `Challenge updated: ${challenge.title}`,
      relatedEntityId: challenge._id,
      relatedEntityType: 'Challenge',
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: { challenge }, message: 'Challenge updated.' });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Challenge ─────────────────────────────────────────────────────────
const deleteChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    if (challenge.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Cannot delete an active challenge. Deactivate it first.' });
    }

    await challenge.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CHALLENGE_DELETE',
      description: `Challenge deleted: ${challenge.title}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Challenge deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── Activate / Deactivate ────────────────────────────────────────────────────
const activateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id, { status: 'ACTIVE' }, { new: true }
    );
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'CHALLENGE_ACTIVATE', description: `Activated: ${challenge.title}`,
      relatedEntityId: challenge._id, relatedEntityType: 'Challenge', ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: { challenge }, message: 'Challenge activated.' });
  } catch (error) { next(error); }
};

const deactivateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id, { status: 'INACTIVE' }, { new: true }
    );
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'CHALLENGE_DEACTIVATE', description: `Deactivated: ${challenge.title}`,
      relatedEntityId: challenge._id, relatedEntityType: 'Challenge', ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: { challenge }, message: 'Challenge deactivated.' });
  } catch (error) { next(error); }
};

// ─── Get Challenge Questions (for admin/staff — includes correct answers) ─────
const getChallengeQuestions = async (req, res, next) => {
  try {
    const questions = await Question.find({ challengeId: req.params.id }).sort({ order: 1 });
    return res.status(200).json({ success: true, data: { questions } });
  } catch (error) { next(error); }
};

// ─── Get Questions for Participant (strips correct answers, orders by attempt) ─
const getChallengeQuestionsParticipant = async (req, res, next) => {
  try {
    const { attemptId } = req.query;
    if (!attemptId) return res.status(400).json({ success: false, message: 'attemptId required.' });

    const Attempt = require('../models/Attempt');
    const attempt = await Attempt.findOne({ _id: attemptId, userId: req.user._id });
    if (!attempt) return res.status(403).json({ success: false, message: 'Attempt not found or access denied.' });

    const questionIds = attempt.questionOrder;
    const allQuestions = await Question.find({ _id: { $in: questionIds } })
      .select('-correctAnswer -explanation'); // Never expose correct answers to participants

    const qMap = {};
    allQuestions.forEach((q) => { qMap[q._id.toString()] = q; });
    const orderedQuestions = questionIds.map((id) => qMap[id.toString()]).filter(Boolean);

    return res.status(200).json({ success: true, data: { questions: orderedQuestions } });
  } catch (error) { next(error); }
};

module.exports = {
  getChallenges, getChallengeById, createChallenge, updateChallenge,
  deleteChallenge, activateChallenge, deactivateChallenge,
  getChallengeQuestions, getChallengeQuestionsParticipant,
};
