const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Store active sessions
const activeSessions = new Map();

const sessionManager = {
  // Create a new session
  createSession: async (user, req) => {
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const session = {
      userId: user._id,
      token,
      lastActivity: Date.now(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Store session
    activeSessions.set(token, session);

    // Log session creation
    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    return token;
  },

  // Validate session
  validateSession: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No session token found'
        });
      }

      const session = activeSessions.get(token);
      if (!session) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid session'
        });
      }

      // Check session expiration
      if (Date.now() - session.lastActivity > 24 * 60 * 60 * 1000) { // 24 hours
        activeSessions.delete(token);
        return res.status(401).json({
          status: 'error',
          message: 'Session expired'
        });
      }

      // Update last activity
      session.lastActivity = Date.now();
      activeSessions.set(token, session);

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found'
        });
      }

      req.user = user;
      req.session = session;
      next();
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(401).json({
        status: 'error',
        message: 'Invalid session'
      });
    }
  },

  // End session
  endSession: async (req) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (token) {
      activeSessions.delete(token);

      // Log session end
      await AuditLog.create({
        user: req.user._id,
        action: 'LOGOUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS'
      });
    }
  },

  // Get all active sessions for a user
  getUserSessions: async (userId) => {
    const sessions = [];
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId.toString() === userId.toString()) {
        sessions.push({
          token,
          lastActivity: session.lastActivity,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        });
      }
    }
    return sessions;
  },

  // End all sessions for a user
  endAllUserSessions: async (userId) => {
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId.toString() === userId.toString()) {
        activeSessions.delete(token);
      }
    }
  }
};

module.exports = sessionManager; 