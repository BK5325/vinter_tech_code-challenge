const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'ABANDONED'],
      default: 'NOT_STARTED',
    },

    // Server-authoritative timer
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    submissionReason: {
      type: String,
      enum: ['MANUAL', 'TIME_EXPIRED', 'VIOLATION_THRESHOLD', 'ADMIN_FORCE', 'ABANDONED', null],
      default: null,
    },

    // Randomized order — stored as array of Question _id strings
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],

    // Randomized option order per question: { questionId: [optionId, ...] }
    optionOrder: { type: Map, of: [String], default: {} },

    // Scoring — calculated server-side after submission
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 }, // seconds

    // Security
    violationCount: { type: Number, default: 0 },
    violationBreakdown: {
      tabSwitch: { type: Number, default: 0 },
      windowBlur: { type: Number, default: 0 },
      fullscreenExit: { type: Number, default: 0 },
      copyAttempt: { type: Number, default: 0 },
      pasteAttempt: { type: Number, default: 0 },
      rightClick: { type: Number, default: 0 },
      keyboardShortcut: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, challengeId: 1 });
attemptSchema.index({ status: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
