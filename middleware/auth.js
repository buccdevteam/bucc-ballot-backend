/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token (jwt.verify is synchronous)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your token has expired! Please log in again.', 401));
      }
      if (err.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token! Please log in again.', 401));
      }
      throw err;
    }

    // 3) Check if user/admin still exists
    // #region agent log
    const _t0 = Date.now();
    // #endregion
    let currentUser;
    if (decoded.role === 'admin' || decoded.role === 'super-admin') {
      currentUser = await Admin.findById(decoded.id);
    } else {
      currentUser = await User.findById(decoded.id);
    }
    // #region agent log
    fetch('http://127.0.0.1:7799/ingest/b081a051-05a3-4288-8ed4-9ae9e74f4251',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aebaeb'},body:JSON.stringify({sessionId:'aebaeb',location:'auth.js:protect',message:'DB user lookup',data:{queryMs:Date.now()-_t0,found:!!currentUser,role:decoded.role||'user'},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
    // #endregion

    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token does no longer exist.', 401)
      );
    }

    // 4) Grant access to protected route
    req.user = {
      id: currentUser._id,
      role: decoded.role || 'user',
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return next(new AppError('Authentication failed. Please try again.', 401));
  }
};

/**
 * Restrict routes to specific roles (e.g., admin only)
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin', 'user']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };
