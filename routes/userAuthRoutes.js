/**
 * User Authentication Routes
 */

const express = require('express');
const passport = require('passport');
const { googleAuth, googleCallback, verifyToken, getMe, setMatricNumber, logout } = require('../controllers/userAuthController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4060';

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

// Google OAuth routes
router.get(
  '/google',
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        status: 'error',
        message: 'Google OAuth is not configured on the server',
      });
    }
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Custom callback so we redirect to FRONTEND with error message
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?success=false&error=${encodeURIComponent('Google OAuth is not configured')}`);
    }
    
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        const msg = err.message || 'Authentication failed';
        const statusCode = err.statusCode || 500;
        console.error(`Authentication error (${statusCode}):`, msg);
        return res.redirect(`${FRONTEND_URL}/auth/callback?success=false&error=${encodeURIComponent(msg)}&statusCode=${statusCode}`);
      }
      if (!user) {
        const msg = info?.message || 'Authentication failed';
        console.error('Authentication failed: No user returned');
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
router.patch('/set-matric-number', protect, setMatricNumber);
router.post('/logout', protect, logout);

module.exports = router;
