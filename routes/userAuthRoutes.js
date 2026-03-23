/**
 * User Authentication Routes (Email & Password)
 */

const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  verifyToken,
  getMe,
  setMatricNumber,
  logout,
} = require('../controllers/userAuthController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be at most 100 characters'),
  body('matricNumber')
    .trim()
    .notEmpty()
    .withMessage('Matric number is required'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Auth routes
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);

// Token verification
router.post('/verify-token', verifyToken);

// Protected routes
router.get('/me', protect, getMe);
router.patch('/set-matric-number', protect, setMatricNumber);
router.post('/logout', protect, logout);

module.exports = router;
