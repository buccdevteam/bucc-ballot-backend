/**
 * Admin Authentication Controller
 */

const Admin = require('../models/Admin');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { createSendToken, signToken } = require('../utils/generateToken');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if admin exists && password is correct
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin || !(await admin.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Update last login
  await admin.updateLastLogin();

  // 4) If everything ok, send token to client
  createSendToken(admin, 200, res);
});

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin)
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

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current logged in admin
 * @access  Private (Admin)
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    return next(new AppError('Admin not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    },
  });
});

/**
 * @route   PATCH /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1) Get admin with password
  const admin = await Admin.findById(req.user.id).select('+password');

  if (!admin) {
    return next(new AppError('Admin not found', 404));
  }

  // 2) Verify current password
  if (!(await admin.correctPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // 3) Update password (pre-save hook will hash it)
  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
  });
});
