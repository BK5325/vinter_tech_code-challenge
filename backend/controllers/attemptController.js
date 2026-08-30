const Attempt = require('../models/Attempt');
const Answer = require('../models/Answer');
const Challenge = require('../models/Challenge');
const Question = require('../models/Question');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');
const { shuffle, randomSubset } = require('../services/randomizationService');
const { scoreAttempt } = require('../services/scoringService');

// Severity mapping for event types
const EVENT_SEVERITY = {
  TAB_SWITCH: 'MEDIUM',
  WINDOW_BLUR: 'LOW',
  WINDOW_FOCUS: 'INFO',
  FULLSCREEN_ENTER: 'INFO',
  FULLSCREEN_EXIT: 'MEDIUM',
  COPY_ATTEMPT: 'MEDIUM',
  PASTE_ATTEMPT: 'LOW',
  CUT_ATTEMPT: 'MEDIUM',
  RIGHT_CLICK: 'LOW',
  KEYBOARD_SHORTCUT: 'LOW',
  PAGE_REFRESH: 'HIGH',
  NETWORK_DISCONNECT: 'MEDIUM',
  NETWORK_RECONNECT: 'INFO',
  CHALLENGE_ABANDONED: 'HIGH',
};

// ─── Start Attempt ────────────────────────────────────────────────────────────
const startAttempt = async (req, res, next) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    if (challenge.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'This challenge is not currently active.' });
    }

    // Check if there's an active attempt (recovery)
    const existingAttempt = await Attempt.findOne({
      userId, challengeId, status: 'IN_PROGRESS',
    });

    if (existingAttempt) {
      // Return existing attempt for recovery
      const answers = await Answer.find({ attemptId: existingAttempt._id });
      return res.status(200).json({
        success: true,
        message: 'Resuming existing attempt.',
        data: { attempt: existingAttempt, answers, isRecovery: true },
      });
    }

    // Check if already submitted
    const submittedAttempt = await Attempt.findOne({
      userId, challengeId, status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
    });
    if (submittedAttempt) {
      return res.status(400).json({ success: false, message: 'You have already completed this challenge.' });
    }

    // Get all questions for this challenge
    let allQuestions = await Question.find({ challengeId });
    if (allQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'This challenge has no questions yet.' });
    }

    // Randomize question selection
    let selectedQuestions;
    if (challenge.questionSelectionMode === 'RANDOM_SUBSET' && challenge.questionPoolSize > 0) {
      selectedQuestions = randomSubset(allQuestions, challenge.questionPoolSize);
    } else {
      selectedQuestions = challenge.randomizeQuestions ? shuffle(allQuestions) : allQuestions;
    }

    const questionOrder = selectedQuestions.map((q) => q._id);

    // Randomize option order per question
    const optionOrder = {};
    if (challenge.randomizeOptions) {
      selectedQuestions.forEach((q) => {
        if (q.options && q.options.length > 0) {
          optionOrder[q._id.toString()] = shuffle(q.options.map((o) => o._id.toString()));
        }
      });
    }

    // Create attempt with server timer
    const now = new Date();
    const endsAt = new Date(now.getTime() + challenge.duration * 60 * 1000);

    const attempt = await Attempt.create({
      userId,
      challengeId,
      status: 'IN_PROGRESS',
      startedAt: now,
      endsAt,
      questionOrder,
      optionOrder,
      totalMarks: challenge.totalMarks,
    });

    // Initialize empty answer docs
    const answerDocs = questionOrder.map((qId) => ({
      attemptId: attempt._id,
      questionId: qId,
      answerData: null,
      isCorrect: null,
      marksAwarded: 0,
      markedForReview: false,
    }));
    const answers = await Answer.insertMany(answerDocs);

    // Log security event for challenge start
    await SecurityEvent.create({
      userId, attemptId: attempt._id, challengeId,
      eventType: 'CHALLENGE_STARTED', severity: 'INFO',
      metadata: { startedAt: now, endsAt },
    });

    await AuditLog.create({
      userId, userEmail: req.user.email,
      action: 'ATTEMPT_START',
      description: `Attempt started for challenge: ${challenge.title}`,
      relatedEntityId: attempt._id, relatedEntityType: 'Attempt', ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: { attempt, answers, isRecovery: false },
      message: 'Attempt started.',
    });
  } catch (error) { next(error); }
};

// ─── Get Attempt State (for recovery) ────────────────────────────────────────
const getAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    // Only owner, staff, or admin
    if (req.user.role === 'PARTICIPANT' && attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Check if time expired — auto-submit
    if (attempt.status === 'IN_PROGRESS' && new Date() > attempt.endsAt) {
      const challenge = await Challenge.findById(attempt.challengeId);
      const scoringResult = await scoreAttempt(attempt, challenge);
      const timeTaken = Math.round((attempt.endsAt - attempt.startedAt) / 1000);

      await Attempt.findByIdAndUpdate(attempt._id, {
        status: 'AUTO_SUBMITTED',
        submittedAt: attempt.endsAt,
        submissionReason: 'TIME_EXPIRED',
        timeTaken,
        ...scoringResult,
      });

      return res.status(200).json({
        success: true,
        data: { attempt: { ...attempt.toObject(), status: 'AUTO_SUBMITTED', submissionReason: 'TIME_EXPIRED' } },
        message: 'Time expired. Attempt auto-submitted.',
      });
    }

    const answers = await Answer.find({ attemptId: attempt._id });

    return res.status(200).json({
      success: true,
      data: {
        attempt,
        answers,
        remainingSeconds: attempt.endsAt ? Math.max(0, Math.round((attempt.endsAt - new Date()) / 1000)) : 0,
      },
    });
  } catch (error) { next(error); }
};

// ─── Save Answer ──────────────────────────────────────────────────────────────
const saveAnswer = async (req, res, next) => {
  try {
    const { questionId, answerData } = req.body;
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    if (attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'This attempt is no longer active.' });
    }

    // Server-side time check
    if (new Date() > attempt.endsAt) {
      return res.status(400).json({ success: false, message: 'Time has expired for this attempt.' });
    }

    // Verify question belongs to this attempt
    const qIdStr = questionId.toString();
    const inOrder = attempt.questionOrder.map((q) => q.toString()).includes(qIdStr);
    if (!inOrder) {
      return res.status(400).json({ success: false, message: 'Question does not belong to this attempt.' });
    }

    const answer = await Answer.findOneAndUpdate(
      { attemptId: attempt._id, questionId },
      { answerData, answeredAt: new Date() },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, data: { answer }, message: 'Answer saved.' });
  } catch (error) { next(error); }
};

// ─── Toggle Review Mark ───────────────────────────────────────────────────────
const toggleReview = async (req, res, next) => {
  try {
    const { questionId, markedForReview } = req.body;
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    if (attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Attempt is not active.' });
    }
    if (new Date() > attempt.endsAt) {
      return res.status(400).json({ success: false, message: 'Time has expired.' });
    }

    const answer = await Answer.findOneAndUpdate(
      { attemptId: attempt._id, questionId },
      { markedForReview },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, data: { answer } });
  } catch (error) { next(error); }
};

// ─── Submit Attempt ───────────────────────────────────────────────────────────
const submitAttempt = async (req, res, next) => {
  try {
    const { reason = 'MANUAL' } = req.body;
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });

    // Only owner can submit (or admin for force-submit)
    if (req.user.role === 'PARTICIPANT' && attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Duplicate submission protection
    if (['SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status)) {
      return res.status(400).json({ success: false, message: 'Attempt has already been submitted.' });
    }

    const challenge = await Challenge.findById(attempt.challengeId);
    const scoringResult = await scoreAttempt(attempt, challenge);
    const now = new Date();
    const timeTaken = Math.round((now - attempt.startedAt) / 1000);
    const finalStatus = reason === 'MANUAL' ? 'SUBMITTED' : 'AUTO_SUBMITTED';

    const updatedAttempt = await Attempt.findByIdAndUpdate(
      attempt._id,
      {
        status: finalStatus,
        submittedAt: now,
        submissionReason: reason,
        timeTaken,
        ...scoringResult,
      },
      { new: true }
    );

    await SecurityEvent.create({
      userId: attempt.userId, attemptId: attempt._id, challengeId: attempt.challengeId,
      eventType: 'CHALLENGE_SUBMITTED', severity: 'INFO',
      metadata: { submissionReason: reason, score: scoringResult.score, timeTaken },
    });

    const auditAction = reason === 'MANUAL' ? 'ATTEMPT_SUBMIT' : 'ATTEMPT_AUTO_SUBMIT';
    await AuditLog.create({
      userId: attempt.userId, userEmail: req.user.email,
      action: auditAction,
      description: `Attempt ${auditAction}: ${attempt._id} — Score: ${scoringResult.score}`,
      relatedEntityId: attempt._id, relatedEntityType: 'Attempt', ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      data: { attempt: updatedAttempt },
      message: 'Attempt submitted successfully.',
    });
  } catch (error) { next(error); }
};

// ─── Log Security Event ───────────────────────────────────────────────────────
const logSecurityEvent = async (req, res, next) => {
  try {
    const { eventType, metadata = {} } = req.body;
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    if (attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const severity = EVENT_SEVERITY[eventType] || 'LOW';

    await SecurityEvent.create({
      userId: req.user._id,
      attemptId: attempt._id,
      challengeId: attempt.challengeId,
      eventType,
      severity,
      metadata,
      timestamp: new Date(),
    });

    // Update violation count in attempt
    const violationTypes = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'RIGHT_CLICK', 'KEYBOARD_SHORTCUT', 'PAGE_REFRESH'];
    if (violationTypes.includes(eventType)) {
      const fieldMap = {
        TAB_SWITCH: 'violationBreakdown.tabSwitch',
        WINDOW_BLUR: 'violationBreakdown.windowBlur',
        FULLSCREEN_EXIT: 'violationBreakdown.fullscreenExit',
        COPY_ATTEMPT: 'violationBreakdown.copyAttempt',
        PASTE_ATTEMPT: 'violationBreakdown.pasteAttempt',
        CUT_ATTEMPT: 'violationBreakdown.copyAttempt',
        RIGHT_CLICK: 'violationBreakdown.rightClick',
        KEYBOARD_SHORTCUT: 'violationBreakdown.keyboardShortcut',
        PAGE_REFRESH: 'violationBreakdown.tabSwitch',
      };

      const updateField = fieldMap[eventType];
      const updatedAttempt = await Attempt.findByIdAndUpdate(
        attempt._id,
        { $inc: { violationCount: 1, [updateField]: 1 } },
        { new: true }
      );

      // Check auto-submit threshold
      const challenge = await Challenge.findById(attempt.challengeId);
      if (
        challenge.securitySettings.autoSubmitOnViolation &&
        updatedAttempt.violationCount >= challenge.securitySettings.violationThreshold
      ) {
        // Auto-submit: score and mark as AUTO_SUBMITTED
        const { scoreAttempt } = require('../services/scoringService');
        const scoringResult = await scoreAttempt(updatedAttempt, challenge);
        const now = new Date();
        const timeTaken = Math.round((now - updatedAttempt.startedAt) / 1000);

        const autoSubmitted = await Attempt.findByIdAndUpdate(
          attempt._id,
          { status: 'AUTO_SUBMITTED', submittedAt: now, submissionReason: 'VIOLATION_THRESHOLD', timeTaken, ...scoringResult },
          { new: true }
        );

        await AuditLog.create({
          userId: attempt.userId, userEmail: req.user.email,
          action: 'ATTEMPT_AUTO_SUBMIT',
          description: `Auto-submitted due to violation threshold: ${attempt._id}`,
          relatedEntityId: attempt._id, relatedEntityType: 'Attempt', ipAddress: req.ip,
        });

        return res.status(200).json({
          success: true,
          message: 'Violation threshold reached. Attempt auto-submitted.',
          data: { attempt: autoSubmitted, autoSubmitted: true },
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Security event logged.' });
  } catch (error) { next(error); }
};

// ─── Get All Attempts (Admin/Staff) ──────────────────────────────────────────
const getAllAttempts = async (req, res, next) => {
  try {
    const { challengeId, userId, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'PARTICIPANT') filter.userId = req.user._id;
    else {
      if (userId) filter.userId = userId;
      if (challengeId) filter.challengeId = challengeId;
    }
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [attempts, total] = await Promise.all([
      Attempt.find(filter)
        .populate('userId', 'name email')
        .populate('challengeId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      Attempt.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { attempts, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

module.exports = { startAttempt, getAttempt, saveAnswer, toggleReview, submitAttempt, logSecurityEvent, getAllAttempts };
