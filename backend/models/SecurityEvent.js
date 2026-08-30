const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', index: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', index: true },
    eventType: {
      type: String,
      enum: [
        'TAB_SWITCH',
        'WINDOW_BLUR',
        'WINDOW_FOCUS',
        'FULLSCREEN_ENTER',
        'FULLSCREEN_EXIT',
        'COPY_ATTEMPT',
        'PASTE_ATTEMPT',
        'CUT_ATTEMPT',
        'RIGHT_CLICK',
        'KEYBOARD_SHORTCUT',
        'PAGE_REFRESH',
        'NETWORK_DISCONNECT',
        'NETWORK_RECONNECT',
        'CHALLENGE_ABANDONED',
        'CHALLENGE_STARTED',
        'CHALLENGE_SUBMITTED',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

securityEventSchema.index({ eventType: 1 });
securityEventSchema.index({ severity: 1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
