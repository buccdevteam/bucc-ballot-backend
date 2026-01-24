/**
 * Catch Async Errors Wrapper
 * Wraps async route handlers to automatically catch errors
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
