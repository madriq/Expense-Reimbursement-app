const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { verifyToken, restrictTo } = require('../middleware/auth');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and PDF are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation middleware
const validateExpense = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  body('category')
    .isIn(['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Other'])
    .withMessage('Invalid category'),
  body('date')
    .isISO8601()
    .withMessage('Invalid date format')
];

// Submit expense
router.post('/submit', 
  verifyToken,
  upload.single('receipt'),
  validateExpense,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const expense = new Expense({
        user: req.user.id,
        amount: req.body.amount,
        description: req.body.description,
        category: req.body.category,
        date: req.body.date,
        receipt: req.file ? req.file.path : null,
        status: 'Pending'
      });

      await expense.save();

      // Log the expense submission
      await AuditLog.create({
        user: req.user.id,
        action: 'CREATE',
        details: `Submitted expense of $${req.body.amount} for ${req.body.category}`,
        status: 'SUCCESS'
      });

      res.status(201).json(expense);
    } catch (error) {
      await AuditLog.create({
        user: req.user.id,
        action: 'CREATE',
        details: `Failed to submit expense: ${error.message}`,
        status: 'FAILED'
      });
      res.status(500).json({ message: 'Error submitting expense' });
    }
  }
);

// Get user's expenses
router.get('/my-expenses', verifyToken, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id })
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Get all expenses (for managers)
router.get('/all', 
  verifyToken, 
  restrictTo('manager', 'admin'),
  async (req, res) => {
    try {
      const expenses = await Expense.find()
        .populate('user', 'name email')
        .sort({ date: -1 });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching expenses' });
    }
  }
);

// Update expense status
router.patch('/:id/status',
  verifyToken,
  restrictTo('manager', 'admin'),
  [
    body('status')
      .isIn(['Approved', 'Rejected'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const expense = await Expense.findById(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      expense.status = req.body.status;
      expense.reviewedBy = req.user.id;
      expense.reviewedAt = new Date();
      await expense.save();

      // Log the status update
      await AuditLog.create({
        user: req.user.id,
        action: 'UPDATE',
        details: `Updated expense status to ${req.body.status}`,
        status: 'SUCCESS'
      });

      res.json(expense);
    } catch (error) {
      await AuditLog.create({
        user: req.user.id,
        action: 'UPDATE',
        details: `Failed to update expense status: ${error.message}`,
        status: 'FAILED'
      });
      res.status(500).json({ message: 'Error updating expense status' });
    }
  }
);

// Get expense statistics
router.get('/stats',
  verifyToken,
  async (req, res) => {
    try {
      const stats = await Expense.aggregate([
        {
          $match: {
            user: req.user.id,
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const monthlyStats = await Expense.aggregate([
        {
          $match: {
            user: req.user.id,
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1 }
        }
      ]);

      res.json({
        categoryStats: stats,
        monthlyStats
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching statistics' });
    }
  }
);

module.exports = router; 