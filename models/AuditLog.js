const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_CHANGE',
      'EXPENSE_CREATE',
      'EXPENSE_UPDATE',
      'EXPENSE_DELETE',
      'EXPENSE_APPROVE',
      'EXPENSE_REJECT',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'ROLE_CHANGE'
    ]
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
auditLogSchema.index({ user: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema); 