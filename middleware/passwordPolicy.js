const { body, validationResult } = require('express-validator');

const passwordPolicy = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      // Check if password contains user's name or email
      const name = req.body.name?.toLowerCase();
      const email = req.body.email?.toLowerCase();
      const password = value.toLowerCase();
      
      if (name && password.includes(name)) {
        throw new Error('Password cannot contain your name');
      }
      if (email && password.includes(email.split('@')[0])) {
        throw new Error('Password cannot contain your email username');
      }
      return true;
    }),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const validatePassword = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  passwordPolicy,
  validatePassword
}; 