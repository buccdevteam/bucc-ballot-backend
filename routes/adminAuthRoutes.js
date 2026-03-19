/**
 * Admin Authentication Routes
 */

const express = require('express');
const { body } = require('express-validator');
const { login, logout, getMe, changePassword } = require('../controllers/adminAuthController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Change password validation rules
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

// Routes
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePasswordValidation, validate, changePassword);

module.exports = router;
