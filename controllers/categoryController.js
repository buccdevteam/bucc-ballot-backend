/**
 * Category Controller
 */

const Category = require('../models/Category');
const Candidate = require('../models/Candidate');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories with candidates
 * @access  Private (Admin)
 */
exports.getAllCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().populate('candidates').sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get single category with candidates
 * @access  Private (Admin)
 */
exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id).populate('candidates');

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

/**
 * @route   POST /api/admin/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
exports.createCategory = catchAsync(async (req, res, next) => {
  const { title, description, allowAbstain } = req.body;

  if (!title || !description) {
    return next(new AppError('Please provide title and description', 400));
  }

  const category = await Category.create({
    title,
    description,
    allowAbstain: allowAbstain !== undefined ? allowAbstain : true,
  });

  res.status(201).json({
    status: 'success',
    data: {
      category,
    },
  });
});

/**
 * @route   PATCH /api/admin/categories/:id
 * @desc    Update category
 * @access  Private (Admin)
 */
exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete category (and its candidates)
 * @access  Private (Admin)
 */
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  // Delete all candidates in this category
  await Candidate.deleteMany({ category: category._id });

  // Delete the category
  await Category.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
