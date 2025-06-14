const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token verification middleware
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header or cookies
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;

    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: 'No token, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Check if token is expired
    if (Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token is not valid' 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({
        status: 'error',
        message: 'User account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      status: 'error',
      message: 'Token is not valid' 
    });
  }
};

// Role-based access control middleware
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if user owns the resource
const checkOwnership = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    
    if (!doc) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Allow access if user is admin or manager
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the document
    if (doc.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking resource ownership'
    });
  }
};

module.exports = {
  verifyToken,
  restrictTo,
  checkOwnership
}; 