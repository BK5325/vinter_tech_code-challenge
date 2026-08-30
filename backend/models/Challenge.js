const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: { type: String, trim: true, default: '' },
    instructions: { type: String, trim: true, default: '' },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 480 minutes'],
    },
    totalMarks: { type: Number, default: 0 },
    totalQuestions: {
      type: Number,
      required: [true, 'Total questions is required'],
      min: 1,
    },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkValue: { type: Number, default: 0, min: 0 },

    // Question selection
    questionSelectionMode: {
      type: String,
      enum: ['ALL', 'RANDOM_SUBSET'],
      default: 'ALL',
    },
    questionPoolSize: { type: Number, default: 0 }, // used when mode = RANDOM_SUBSET

    // Randomization
    randomizeQuestions: { type: Boolean, default: true },
    randomizeOptions: { type: Boolean, default: true },

    // Question types allowed
    allowedQuestionTypes: {
      type: [String],
      enum: ['OMR', 'MCQ', 'SHORT_ANSWER'],
      default: ['OMR', 'MCQ', 'SHORT_ANSWER'],
    },

    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'DRAFT',
    },

    // Availability window
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },

    // Visibility settings
    scoreVisibility: {
      type: String,
      enum: ['IMMEDIATE', 'HIDDEN', 'MANUAL'],
      default: 'IMMEDIATE',
    },
    rankVisibility: {
      type: String,
      enum: ['SHOW', 'HIDE'],
      default: 'SHOW',
    },
    correctAnswerVisibility: {
      type: String,
      enum: ['SHOW_AFTER_SUBMIT', 'NEVER', 'SHOW_AFTER_END'],
      default: 'NEVER',
    },

    // Security settings
    securitySettings: {
      maxTabSwitches: { type: Number, default: 3 },
      maxWindowBlur: { type: Number, default: 5 },
      maxFullscreenExits: { type: Number, default: 3 },
      autoSubmitOnViolation: { type: Boolean, default: false },
      violationThreshold: { type: Number, default: 10 },
    },

    // Marks per question default
    marksPerQuestion: { type: Number, default: 1 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

challengeSchema.index({ status: 1 });
challengeSchema.index({ createdBy: 1 });
challengeSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
