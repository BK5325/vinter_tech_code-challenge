const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTER',
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_ACTIVATE',
        'USER_DEACTIVATE',
        'USER_DELETE',
        'ROLE_CHANGE',
        'CHALLENGE_CREATE',
        'CHALLENGE_UPDATE',
        'CHALLENGE_DELETE',
        'CHALLENGE_ACTIVATE',
        'CHALLENGE_DEACTIVATE',
        'CHALLENGE_ARCHIVE',
        'QUESTION_CREATE',
        'QUESTION_UPDATE',
        'QUESTION_DELETE',
        'QUESTION_DUPLICATE',
        'ATTEMPT_START',
        'ATTEMPT_SUBMIT',
        'ATTEMPT_AUTO_SUBMIT',
        'ATTEMPT_RESET',
        'SCORE_RECALCULATE',
        'ADMIN_ACTION',
        'EXPORT_DATA',
        'SETTINGS_UPDATE',
      ],
    },
    description: { type: String, trim: true, default: '' },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
    relatedEntityType: { type: String, enum: ['User', 'Challenge', 'Question', 'Attempt', null], default: null },
    ipAddress: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
