/**
 * User Authentication Routes
 */

const express = require('express');
const passport = require('passport');
const { googleAuth, googleCallback, verifyToken, getMe, logout } = require('../controllers/userAuthController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4060';

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Custom callback so we redirect to FRONTEND with error message (e.g. non-Babcock email)
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        const msg = err.message || 'Authentication failed';
        return res.redirect(`${FRONTEND_URL}/auth/callback?success=false&error=${encodeURIComponent(msg)}`);
      }
      if (!user) {
        const msg = info?.message || 'Authentication failed';
        return res.redirect(`${FRONTEND_URL}/auth/callback?success=false&error=${encodeURIComponent(msg)}`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  googleCallback
);

// Token verification
router.post('/verify-token', verifyToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
