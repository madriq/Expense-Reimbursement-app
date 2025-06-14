const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { passwordPolicy, validatePassword } = require('../middleware/passwordPolicy');
const sessionManager = require('../middleware/sessionManager');
const { verifyToken } = require('../middleware/auth');

// Register new user
router.post('/register', passwordPolicy, validatePassword, async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      await AuditLog.create({
        user: user._id,
        action: 'USER_CREATE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: { reason: 'Email already exists' }
      });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      department,
      role: role || 'employee',
      active: true,
      lastPasswordChange: Date.now()
    });

    await user.save();

    // Create session
    const token = await sessionManager.createSession(user, req);

    // Log successful registration
    await AuditLog.create({
      user: user._id,
      action: 'USER_CREATE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      await AuditLog.create({
        user: null,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: { reason: 'User not found' }
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.active) {
      await AuditLog.create({
        user: user._id,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: { reason: 'Account deactivated' }
      });
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await AuditLog.create({
        user: user._id,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: { reason: 'Invalid password' }
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create session
    const token = await sessionManager.createSession(user, req);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout user
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await sessionManager.endSession(req);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user sessions
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.user._id);
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End all sessions
router.post('/sessions/end-all', verifyToken, async (req, res) => {
  try {
    await sessionManager.endAllUserSessions(req.user._id);
    res.json({ message: 'All sessions ended successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', verifyToken, passwordPolicy, validatePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      await AuditLog.create({
        user: user._id,
        action: 'PASSWORD_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: { reason: 'Current password incorrect' }
      });
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.lastPasswordChange = Date.now();
    await user.save();

    // End all sessions
    await sessionManager.endAllUserSessions(user._id);

    // Log password change
    await AuditLog.create({
      user: user._id,
      action: 'PASSWORD_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 