const mongoose = require('mongoose');
const Question = require('../models/Question');
const Challenge = require('../models/Challenge');
const Answer = require('../models/Answer');
const Attempt = require('../models/Attempt');
const AuditLog = require('../models/AuditLog');

/**
 * Helper to recalculate a challenge's totalMarks and totalQuestions
 */
const recalculateChallenge = async (challengeId) => {
  if (!challengeId) return;
  const activeQuestions = await Question.find({ challengeId, isDeleted: { $ne: true } });
  const totalMarks = activeQuestions.reduce((s, q) => s + (q.marks || 0), 0);
  await Challenge.findByIdAndUpdate(challengeId, {
    totalMarks,
    totalQuestions: activeQuestions.length,
  });
};

/**
 * Safely remove or soft-delete a question to preserve attempt history
 */
const safelyRemoveOrSoftDelete = async (questionId) => {
  const hasAnswers = await Answer.exists({ questionId });
  const hasAttempts = await Attempt.exists({ questionOrder: questionId });
  if (hasAnswers || hasAttempts) {
    await Question.findByIdAndUpdate(questionId, { isDeleted: true });
    return 'soft';
  } else {
    await Question.findByIdAndDelete(questionId);
    return 'hard';
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const {
      challengeId,
      questionType,
      difficulty,
      category,
      search,
      sortBy = 'order',
      sortOrder = 'asc',
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (challengeId) filter.challengeId = challengeId;
    if (questionType) filter.questionType = questionType;
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (search) filter.questionText = { $regex: search, $options: 'i' };

    const sortObj = {};
    const direction = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'marks') sortObj.marks = direction;
    else if (sortBy === 'difficulty') sortObj.difficulty = direction;
    else if (sortBy === 'createdAt') sortObj.createdAt = direction;
    else sortObj.order = direction;
    sortObj.createdAt = -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
      Question.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit)),
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
    const question = await Question.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
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

    const question = await Question.create({ ...req.body, createdBy: req.user._id, isDeleted: false });

    // Recalculate challenge total marks
    if (challengeId) {
      await recalculateChallenge(challengeId);
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
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Recalculate challenge total marks
    await recalculateChallenge(question.challengeId);

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
    const question = await Question.findById(req.params.id);
    if (!question || question.isDeleted) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    await safelyRemoveOrSoftDelete(question._id);
    await recalculateChallenge(question.challengeId);

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
    if (!original || original.isDeleted) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const duplicate = await Question.create({
      ...original.toObject(),
      _id: undefined,
      questionText: `${original.questionText} (Copy)`,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined,
      isDeleted: false,
    });

    await recalculateChallenge(original.challengeId);

    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email,
      action: 'QUESTION_DUPLICATE', description: `Question duplicated from ${original._id}`,
      relatedEntityId: duplicate._id, relatedEntityType: 'Question', ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: { question: duplicate }, message: 'Question duplicated.' });
  } catch (error) { next(error); }
};

/**
 * Bulk delete questions by IDs
 */
const bulkDeleteQuestions = async (req, res, next) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'questionIds array is required.' });
    }

    const validIds = questionIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid question IDs provided.' });
    }

    const questions = await Question.find({ _id: { $in: validIds }, isDeleted: { $ne: true } });
    if (questions.length === 0) {
      return res.status(200).json({ success: true, message: 'No matching questions found to delete.', deletedCount: 0 });
    }

    const affectedChallengeIds = new Set();
    let deletedCount = 0;

    for (const q of questions) {
      if (q.challengeId) affectedChallengeIds.add(q.challengeId.toString());
      await safelyRemoveOrSoftDelete(q._id);
      deletedCount++;
    }

    for (const chId of affectedChallengeIds) {
      await recalculateChallenge(chId);
    }

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'QUESTION_BULK_DELETE',
      description: `Bulk deleted ${deletedCount} questions across challenges: ${Array.from(affectedChallengeIds).join(', ')}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} question(s).`,
      deletedCount,
    });
  } catch (error) { next(error); }
};

/**
 * Delete all questions within a specific challenge
 */
const deleteAllQuestions = async (req, res, next) => {
  try {
    const { challengeId, confirmation } = req.body;
    if (!challengeId) {
      return res.status(400).json({ success: false, message: 'challengeId is required.' });
    }
    if (confirmation !== 'DELETE ALL') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation mismatch. You must explicitly confirm with "DELETE ALL".',
      });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    const questions = await Question.find({ challengeId, isDeleted: { $ne: true } });
    if (questions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No questions found in this challenge to delete.',
        deletedCount: 0,
      });
    }

    let deletedCount = 0;
    for (const q of questions) {
      await safelyRemoveOrSoftDelete(q._id);
      deletedCount++;
    }

    await recalculateChallenge(challengeId);

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'QUESTION_DELETE_ALL',
      description: `Deleted all ${deletedCount} questions for challenge "${challenge.title}" (${challengeId})`,
      relatedEntityId: challenge._id,
      relatedEntityType: 'Challenge',
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted all ${deletedCount} question(s) from challenge "${challenge.title}".`,
      deletedCount,
    });
  } catch (error) { next(error); }
};

/**
 * Bulk import questions
 */
const bulkImportQuestions = async (req, res, next) => {
  try {
    const { challengeId, questions } = req.body;
    if (!challengeId) {
      return res.status(400).json({ success: false, message: 'challengeId is required.' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'questions array is required and cannot be empty.' });
    }
    if (questions.length > 500) {
      return res.status(400).json({ success: false, message: 'Cannot import more than 500 questions in a single batch.' });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    // Get current max order
    const maxOrderQ = await Question.findOne({ challengeId }).sort({ order: -1 }).select('order');
    let startOrder = maxOrderQ ? (maxOrderQ.order + 1) : 0;

    const validatedDocs = [];
    const errors = [];

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const text = q.questionText ? String(q.questionText).trim() : '';
      if (!text) {
        errors.push(`Question #${qNum}: Question text is required.`);
        return;
      }

      let qType = q.questionType;
      if (!['OMR', 'MCQ', 'SHORT_ANSWER', 'LONG_ANSWER'].includes(qType)) {
        qType = 'MCQ';
      }

      const marks = typeof q.marks === 'number' && !isNaN(q.marks) && q.marks >= 0 ? q.marks : 1;
      const negativeMarks = typeof q.negativeMarks === 'number' && !isNaN(q.negativeMarks) && q.negativeMarks >= 0 ? q.negativeMarks : 0;
      const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty) ? q.difficulty : 'MEDIUM';
      const category = q.category ? String(q.category).trim() : 'General';
      const explanation = q.explanation ? String(q.explanation).trim() : '';

      let options = [];
      let correctAnswer = q.correctAnswer;
      let multipleCorrect = Boolean(q.multipleCorrect);

      if (qType === 'MCQ' || qType === 'OMR') {
        const rawOpts = Array.isArray(q.options) ? q.options : [];
        if (rawOpts.length < 2) {
          errors.push(`Question #${qNum}: MCQ must have at least 2 options.`);
          return;
        }

        // Generate options with valid ObjectIds
        options = rawOpts.map((opt, oIdx) => ({
          _id: new mongoose.Types.ObjectId(),
          text: typeof opt === 'object' && opt.text ? String(opt.text).trim() : String(opt).trim(),
          order: oIdx,
        }));

        if (correctAnswer === undefined || correctAnswer === null || correctAnswer === '') {
          errors.push(`Question #${qNum}: Correct answer is required for MCQ.`);
          return;
        }

        const mapToOptionId = (ans) => {
          if (ans === null || ans === undefined) return null;
          const ansStr = String(ans).trim();

          // Already matching an option _id
          const matchingId = options.find((o) => o._id.toString() === ansStr);
          if (matchingId) return matchingId._id.toString();

          // Letter A-Z
          if (/^[A-Za-z]$/.test(ansStr)) {
            const letterIdx = ansStr.toUpperCase().charCodeAt(0) - 65;
            if (letterIdx >= 0 && letterIdx < options.length) {
              return options[letterIdx]._id.toString();
            }
          }

          // Index
          const num = parseInt(ansStr, 10);
          if (!isNaN(num)) {
            if (num >= 1 && num <= options.length) return options[num - 1]._id.toString();
            if (num === 0 && options.length > 0) return options[0]._id.toString();
          }

          // Text match
          const matchingText = options.find((o) => o.text.toLowerCase() === ansStr.toLowerCase());
          if (matchingText) return matchingText._id.toString();

          return null;
        };

        if (multipleCorrect || Array.isArray(correctAnswer)) {
          const ansArr = Array.isArray(correctAnswer) ? correctAnswer : String(correctAnswer).split(/[,;&]/);
          const mappedIds = ansArr.map(mapToOptionId).filter(Boolean);
          if (mappedIds.length === 0) {
            errors.push(`Question #${qNum}: Correct answers "${correctAnswer}" could not be matched to any option.`);
            return;
          }
          correctAnswer = mappedIds;
          multipleCorrect = true;
          qType = 'MCQ';
        } else {
          const mappedId = mapToOptionId(correctAnswer);
          if (!mappedId) {
            errors.push(`Question #${qNum}: Correct answer "${correctAnswer}" could not be matched to any option.`);
            return;
          }
          correctAnswer = mappedId;
        }
      } else {
        options = [];
        correctAnswer = correctAnswer !== undefined && correctAnswer !== null ? String(correctAnswer).trim() : '';
      }

      validatedDocs.push({
        challengeId,
        questionText: text,
        questionType: qType,
        options,
        correctAnswer,
        multipleCorrect,
        evaluationMode: q.evaluationMode || (qType === 'LONG_ANSWER' ? 'MANUAL' : 'CASE_INSENSITIVE'),
        marks,
        negativeMarks,
        difficulty,
        category,
        explanation,
        createdBy: req.user._id,
        order: startOrder++,
        isDeleted: false,
      });
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed for ${errors.length} question(s).`,
        errors,
      });
    }

    if (validatedDocs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid questions to import.' });
    }

    const insertedQuestions = await Question.insertMany(validatedDocs);
    await recalculateChallenge(challengeId);

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'QUESTION_BULK_IMPORT',
      description: `Bulk imported ${insertedQuestions.length} questions for challenge: ${challenge.title} (${challengeId})`,
      relatedEntityId: challenge._id,
      relatedEntityType: 'Challenge',
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${insertedQuestions.length} questions.`,
      data: {
        importedCount: insertedQuestions.length,
        questions: insertedQuestions,
      },
    });
  } catch (error) { next(error); }
};

const getCategories = async (req, res, next) => {
  try {
    const { challengeId } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (challengeId) filter.challengeId = challengeId;
    const categories = await Question.distinct('category', filter);
    return res.status(200).json({ success: true, data: { categories: categories.filter(Boolean) } });
  } catch (error) { next(error); }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  bulkDeleteQuestions,
  deleteAllQuestions,
  bulkImportQuestions,
  getCategories,
};
