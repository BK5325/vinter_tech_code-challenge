const mongoose = require('mongoose');
const {
  bulkDeleteQuestions,
  deleteAllQuestions,
  bulkImportQuestions,
} = require('../controllers/questionController');
const { evaluateAnswer } = require('../controllers/resultController');
const Question = require('../models/Question');
const Challenge = require('../models/Challenge');
const Answer = require('../models/Answer');
const Attempt = require('../models/Attempt');
const AuditLog = require('../models/AuditLog');

// Mock Mongoose models
jest.mock('../models/Question');
jest.mock('../models/Challenge');
jest.mock('../models/Answer');
jest.mock('../models/Attempt');
jest.mock('../models/AuditLog');

describe('Questions Controller Unit Tests (Features 1, 2, 3, 10, 12)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: new mongoose.Types.ObjectId(), email: 'admin@vintertech.org', role: 'ADMIN' },
      ip: '127.0.0.1',
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    AuditLog.create = jest.fn().mockResolvedValue({});
  });

  describe('FEATURE 1: Bulk Delete Questions', () => {
    test('Rejects request if questionIds is missing or empty', async () => {
      req.body = { questionIds: [] };
      await bulkDeleteQuestions(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('Deletes multiple selected questions safely', async () => {
      const qId1 = new mongoose.Types.ObjectId();
      const qId2 = new mongoose.Types.ObjectId();
      const chId = new mongoose.Types.ObjectId();

      req.body = { questionIds: [qId1.toString(), qId2.toString()] };

      Question.find = jest.fn().mockResolvedValue([
        { _id: qId1, challengeId: chId, marks: 2 },
        { _id: qId2, challengeId: chId, marks: 3 },
      ]);
      Answer.exists = jest.fn().mockResolvedValue(false);
      Attempt.exists = jest.fn().mockResolvedValue(false);
      Question.findByIdAndDelete = jest.fn().mockResolvedValue({});
      Challenge.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await bulkDeleteQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        deletedCount: 2,
      }));
    });

    test('Soft-deletes questions referenced by completed attempts to preserve history', async () => {
      const qId = new mongoose.Types.ObjectId();
      const chId = new mongoose.Types.ObjectId();
      req.body = { questionIds: [qId.toString()] };

      Question.find = jest.fn().mockResolvedValue([{ _id: qId, challengeId: chId, marks: 2 }]);
      // Referenced in an answer!
      Answer.exists = jest.fn().mockResolvedValue(true);
      Question.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await bulkDeleteQuestions(req, res, next);

      expect(Question.findByIdAndUpdate).toHaveBeenCalledWith(qId, { isDeleted: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deletedCount: 1 }));
    });
  });

  describe('FEATURE 2: Delete All Questions in Challenge', () => {
    test('Rejects operation if confirmation is missing or incorrect', async () => {
      req.body = { challengeId: new mongoose.Types.ObjectId().toString(), confirmation: 'delete' };
      await deleteAllQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('DELETE ALL'),
      }));
    });

    test('Deletes all questions in target challenge when confirmation matches', async () => {
      const chId = new mongoose.Types.ObjectId();
      const qId1 = new mongoose.Types.ObjectId();
      req.body = { challengeId: chId.toString(), confirmation: 'DELETE ALL' };

      Challenge.findById = jest.fn().mockResolvedValue({ _id: chId, title: 'Python Mini-Projects' });
      Question.find = jest.fn().mockResolvedValue([{ _id: qId1, challengeId: chId, marks: 2 }]);
      Answer.exists = jest.fn().mockResolvedValue(false);
      Attempt.exists = jest.fn().mockResolvedValue(false);
      Question.findByIdAndDelete = jest.fn().mockResolvedValue({});
      Challenge.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await deleteAllQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        deletedCount: 1,
      }));
    });
  });

  describe('FEATURE 10: Bulk Import Questions', () => {
    test('Validates and imports questions with auto-generated option IDs', async () => {
      const chId = new mongoose.Types.ObjectId();
      req.body = {
        challengeId: chId.toString(),
        questions: [
          {
            questionText: 'What is 2 + 2?',
            questionType: 'MCQ',
            options: [{ text: '3' }, { text: '4' }, { text: '5' }],
            correctAnswer: 'B',
            marks: 2,
          },
          {
            questionText: 'Explain decorators in Python.',
            questionType: 'LONG_ANSWER',
            correctAnswer: 'A decorator is a function that takes another function...',
            marks: 5,
          },
        ],
      };

      Challenge.findById = jest.fn().mockResolvedValue({ _id: chId, title: 'Test Challenge' });
      Question.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
      });
      Question.insertMany = jest.fn().mockResolvedValue([{}, {}]);
      Question.find = jest.fn().mockResolvedValue([]);
      Challenge.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await bulkImportQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ importedCount: 2 }),
      }));
    });

    test('Rejects import if an MCQ is missing correct answer', async () => {
      const chId = new mongoose.Types.ObjectId();
      req.body = {
        challengeId: chId.toString(),
        questions: [
          {
            questionText: 'Question without answer',
            questionType: 'MCQ',
            options: [{ text: 'Opt 1' }, { text: 'Opt 2' }],
            correctAnswer: '',
            marks: 2,
          },
        ],
      };

      Challenge.findById = jest.fn().mockResolvedValue({ _id: chId, title: 'Test Challenge' });
      Question.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
      });

      await bulkImportQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        errors: expect.arrayContaining([expect.stringContaining('Correct answer is required')]),
      }));
    });
  });

  describe('FEATURE 3: Manual Evaluation for Long Answer Questions', () => {
    test('Rejects marks awarded exceeding question maximum marks', async () => {
      const ansId = new mongoose.Types.ObjectId();
      req.params = { answerId: ansId.toString() };
      req.body = { marksAwarded: 10, feedback: 'Great job' };

      Answer.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: ansId,
          questionId: { marks: 5, questionType: 'LONG_ANSWER' },
        }),
      });

      await evaluateAnswer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('cannot exceed maximum marks'),
      }));
    });

    test('Awards marks, records evaluator feedback, and updates attempt score', async () => {
      const ansId = new mongoose.Types.ObjectId();
      const attId = new mongoose.Types.ObjectId();
      req.params = { answerId: ansId.toString() };
      req.body = { marksAwarded: 4, feedback: 'Well structured explanation' };

      const mockAnswerDoc = {
        _id: ansId,
        attemptId: attId,
        questionId: { marks: 5, questionType: 'LONG_ANSWER' },
        marksAwarded: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      Answer.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnswerDoc),
      });

      const mockAttemptDoc = {
        _id: attId,
        totalMarks: 10,
        score: 0,
        percentage: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      Attempt.findById = jest.fn().mockResolvedValue(mockAttemptDoc);
      Answer.find = jest.fn().mockResolvedValue([{ marksAwarded: 4, isCorrect: true }]);

      await evaluateAnswer(req, res, next);

      expect(mockAnswerDoc.marksAwarded).toBe(4);
      expect(mockAnswerDoc.isCorrect).toBe(true);
      expect(mockAnswerDoc.evaluationStatus).toBe('EVALUATED');
      expect(mockAnswerDoc.evaluatorFeedback).toBe('Well structured explanation');
      expect(mockAttemptDoc.score).toBe(4);
      expect(mockAttemptDoc.percentage).toBe(40);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
