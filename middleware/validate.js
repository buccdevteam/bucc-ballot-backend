/**
 * Validation Middleware using express-validator
 */

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware to check validation results
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};
