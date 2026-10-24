const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    // For OMR/MCQ: option _id string or array; for SHORT_ANSWER/LONG_ANSWER: text string
    answerData: { type: mongoose.Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    answeredAt: { type: Date, default: null },
    markedForReview: { type: Boolean, default: false },
    // Evaluation fields for long answers & subjective evaluation
    evaluationStatus: {
      type: String,
      enum: ['PENDING', 'EVALUATED', 'NOT_APPLICABLE'],
      default: 'NOT_APPLICABLE',
    },
    evaluatorFeedback: { type: String, trim: true, default: '' },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    evaluatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

answerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
