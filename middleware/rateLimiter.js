/**
 * Rate Limiter Middleware
 * Exports rate limiters for use in routes
 */

const rateLimit = require('express-rate-limit');

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
