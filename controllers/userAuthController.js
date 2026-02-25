/**
 * User Authentication Controller
 */

const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { createSendToken, signToken } = require('../utils/generateToken');

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth login
 * @access  Public
 */
exports.googleAuth = catchAsync(async (req, res, next) => {
  // This will be handled by passport middleware
  // Just redirect to Google OAuth
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
exports.googleCallback = catchAsync(async (req, res, next) => {
  // This will be handled by passport middleware
  // After successful authentication, create JWT and redirect
  if (req.user) {
    const token = signToken(req.user._id, 'user');
    
    // Update last login
    await req.user.updateLastLogin();

    // Redirect to frontend with token
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:4060';
    res.redirect(`${frontendURL}/auth/callback?token=${token}&success=true`);
  } else {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:4060';
    res.redirect(`${frontendURL}/auth/callback?success=false&error=Authentication failed`);
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token and return user data
 * @access  Public
 */
exports.verifyToken = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Token is required', 400));
  }

  const jwt = require('jsonwebtoken');
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        matricNumber: user.matricNumber,
        department: user.department,
        hasVoted: user.hasVoted,
      },
    },
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private (User)
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        matricNumber: user.matricNumber,
        department: user.department,
        hasVoted: user.hasVoted,
        lastLogin: user.lastLogin,
      },
    },
  });
});

/**
 * @route   PATCH /api/auth/set-matric-number
 * @desc    Set or update matric number for authenticated user
 * @access  Private (User)
 */
exports.setMatricNumber = catchAsync(async (req, res, next) => {
  const { matricNumber } = req.body;

  if (!matricNumber || typeof matricNumber !== 'string') {
    return next(new AppError('Matric number is required', 400));
  }

  const trimmed = matricNumber.trim();
  if (!trimmed) {
    return next(new AppError('Matric number cannot be empty', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { matricNumber: trimmed },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        matricNumber: user.matricNumber,
        department: user.department,
        hasVoted: user.hasVoted,
      },
    },
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private (User)
 */
exports.logout = catchAsync(async (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});
