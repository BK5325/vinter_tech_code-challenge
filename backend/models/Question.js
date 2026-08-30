const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  text: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
});

const questionSchema = new mongoose.Schema(
  {
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['OMR', 'MCQ', 'SHORT_ANSWER'],
      required: true,
    },
    // For OMR and MCQ
    options: [optionSchema],

    // For OMR: single option _id string
    // For MCQ: single or array of option _id strings
    // For SHORT_ANSWER: plain text string(s)
    correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },

    // MCQ: single or multiple correct answers
    multipleCorrect: { type: Boolean, default: false },

    // Short answer evaluation
    evaluationMode: {
      type: String,
      enum: ['EXACT', 'CASE_INSENSITIVE', 'TRIMMED'],
      default: 'CASE_INSENSITIVE',
    },

    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },

    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    category: { type: String, trim: true, default: 'General' },
    explanation: { type: String, trim: true, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order: { type: Number, default: 0 }, // default display order in bank
  },
  { timestamps: true }
);

questionSchema.index({ challengeId: 1 });
questionSchema.index({ questionType: 1 });
questionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
