const Question = require('../models/Question');
const Challenge = require('../models/Challenge');
const AuditLog = require('../models/AuditLog');

const getQuestions = async (req, res, next) => {
  try {
    const { challengeId, questionType, difficulty, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (challengeId) filter.challengeId = challengeId;
    if (questionType) filter.questionType = questionType;
    if (difficulty) filter.difficulty = difficulty;
    if (search) filter.questionText = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Question.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { questions, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });
    return res.status(200).json({ success: true, data: { question } });
  } catch (error) { next(error); }
};

const createQuestion = async (req, res, next) => {
  try {
    const { challengeId } = req.body;
    if (challengeId) {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    const question = await Question.create({ ...req.body, createdBy: req.user._id });

    // Recalculate challenge total marks
    if (challengeId) {
      const allQ = await Question.find({ challengeId });
      const totalMarks = allQ.reduce((s, q) => s + q.marks, 0);
      await Challenge.findByIdAndUpdate(challengeId, { totalMarks, totalQuestions: allQ.length });
    }

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'QUESTION_CREATE', description: `Question created for challenge ${challengeId}`,
      relatedEntityId: question._id, relatedEntityType: 'Question', ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: { question }, message: 'Question created.' });
  } catch (error) { next(error); }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Recalculate challenge total marks
    const allQ = await Question.find({ challengeId: question.challengeId });
    const totalMarks = allQ.reduce((s, q) => s + q.marks, 0);
    await Challenge.findByIdAndUpdate(question.challengeId, { totalMarks });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'QUESTION_UPDATE', description: `Question updated: ${question._id}`,
      relatedEntityId: question._id, relatedEntityType: 'Question', ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: { question }, message: 'Question updated.' });
  } catch (error) { next(error); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Recalculate challenge total marks
    const allQ = await Question.find({ challengeId: question.challengeId });
    const totalMarks = allQ.reduce((s, q) => s + q.marks, 0);
    await Challenge.findByIdAndUpdate(question.challengeId, { totalMarks, totalQuestions: allQ.length });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'QUESTION_DELETE', description: `Question deleted: ${question._id}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Question deleted.' });
  } catch (error) { next(error); }
};

const duplicateQuestion = async (req, res, next) => {
  try {
    const original = await Question.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Question not found.' });

    const duplicate = await Question.create({
      ...original.toObject(),
      _id: undefined,
      questionText: `${original.questionText} (Copy)`,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined,
    });

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'QUESTION_DUPLICATE', description: `Question duplicated from ${original._id}`,
      relatedEntityId: duplicate._id, relatedEntityType: 'Question', ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: { question: duplicate }, message: 'Question duplicated.' });
  } catch (error) { next(error); }
};

module.exports = { getQuestions, getQuestionById, createQuestion, updateQuestion, deleteQuestion, duplicateQuestion };
