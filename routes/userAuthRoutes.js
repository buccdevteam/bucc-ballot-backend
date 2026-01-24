/**
 * User Authentication Routes
 */

const express = require('express');
const passport = require('passport');
const { googleAuth, googleCallback, verifyToken, getMe, logout } = require('../controllers/userAuthController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/callback?success=false',
  }),
  googleCallback
);

// Token verification
router.post('/verify-token', verifyToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
