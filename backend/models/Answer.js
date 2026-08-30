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
    // For OMR/MCQ: option _id string or array; for SHORT_ANSWER: text string
    answerData: { type: mongoose.Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    answeredAt: { type: Date, default: null },
    markedForReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

answerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
