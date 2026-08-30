const mongoose = require('mongoose');

const roleChangeLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    oldRole: { type: String, enum: ['PARTICIPANT', 'STAFF', 'ADMIN'], required: true },
    newRole: { type: String, enum: ['PARTICIPANT', 'STAFF', 'ADMIN'], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

roleChangeLogSchema.index({ changedBy: 1 });

module.exports = mongoose.model('RoleChangeLog', roleChangeLogSchema);
