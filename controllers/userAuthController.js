/**
 * User Authentication Controller
 */

const User = require('../models/User');
const ValidVoter = require('../models/ValidVoter');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { signToken } = require('../utils/generateToken');

const VALID_EMAIL_DOMAIN = '@student.babcock.edu.ng';
const DEFAULT_ELIGIBILITY_DEPARTMENT = 'bucc';

/**
 * Helper to send token and user in response (for login/register)
 */
function sendUserToken(user, statusCode, res) {
  const token = signToken(user._id, 'user');
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: userObj._id,
        email: userObj.email,
        name: userObj.name,
        photoURL: userObj.photoURL,
        matricNumber: userObj.matricNumber,
        department: userObj.department,
        hasVoted: userObj.hasVoted,
      },
    },
  });
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (must be in valid voter list)
 * @access  Public
 */
exports.register = catchAsync(async (req, res, next) => {
  const { email, password, name, matricNumber } = req.body;

  if (!email || !password || !name || !matricNumber) {
    return next(new AppError('Please provide email, password, name, and matric number', 400));
  }

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.endsWith(VALID_EMAIL_DOMAIN)) {
    return next(new AppError('Only Babcock University student emails (@student.babcock.edu.ng) are allowed', 400));
  }

  const matricUpper = matricNumber.trim().toUpperCase();
  const validVoter = await ValidVoter.findOne({
    matricNumber: matricUpper,
    department: { $regex: new RegExp(`^${DEFAULT_ELIGIBILITY_DEPARTMENT}$`, 'i') },
  });

  if (!validVoter) {
    return next(new AppError('Your matric number is not in the list of eligible voters. Please contact support.', 403));
  }

  let user = await User.findOne({ email: emailLower });

  if (user) {
    if (user.provider === 'credentials') {
      return next(new AppError('Account already exists. Please log in.', 400));
    }
    // Migrate Google user to credentials
    user.password = password;
    user.provider = 'credentials';
    user.googleId = undefined;
    user.name = name.trim();
    user.matricNumber = matricUpper;
    user.department = validVoter.department;
    await user.save({ validateBeforeSave: true });
  } else {
    user = await User.create({
      email: emailLower,
      password,
      name: name.trim(),
      matricNumber: matricUpper,
      department: validVoter.department,
      provider: 'credentials',
      hasVoted: false,
    });
  }

  await user.updateLastLogin();
  sendUserToken(user, 201, res);
});

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !user.password) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  await user.updateLastLogin();
  sendUserToken(user, 200, res);
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
