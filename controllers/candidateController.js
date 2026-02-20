/**
 * Candidate Controller
 */

const Candidate = require('../models/Candidate');
const Category = require('../models/Category');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * @route   GET /api/candidates
 * @desc    Get all candidates (public endpoint)
 * @access  Public
 */
exports.getAllCandidates = catchAsync(async (req, res) => {
  const candidates = await Candidate.find()
    .populate('category', 'title description allowAbstain isActive')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: candidates.length,
    data: {
      candidates,
    },
  });
});

/**
 * @route   GET /api/candidates/category/:categoryId
 * @desc    Get candidates by category (public endpoint)
 * @access  Public
 */
exports.getCandidatesByCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  const candidates = await Candidate.find({ category: req.params.categoryId })
    .populate('category', 'title description allowAbstain')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: candidates.length,
    data: {
      category: {
        id: category._id,
        title: category.title,
        description: category.description,
        allowAbstain: category.allowAbstain,
      },
      candidates,
    },
  });
});

/**
 * @route   GET /api/admin/candidates
 * @desc    Get all candidates (admin)
 * @access  Private (Admin)
 */
exports.getAllCandidatesAdmin = catchAsync(async (req, res) => {
  const candidates = await Candidate.find()
    .populate('category', 'title description')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: candidates.length,
    data: {
      candidates,
    },
  });
});

/**
 * @route   GET /api/admin/candidates/:id
 * @desc    Get single candidate
 * @access  Private (Admin)
 */
exports.getCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate('category');

  if (!candidate) {
    return next(new AppError('No candidate found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      candidate,
    },
  });
});

/**
 * @route   POST /api/admin/candidates
 * @desc    Create new candidate
 * @access  Private (Admin)
 */
exports.createCandidate = catchAsync(async (req, res, next) => {
  const { name, photoURL, manifesto, department, level, category } = req.body;

  if (!name || !photoURL || !manifesto || !department || !level || !category) {
    return next(
      new AppError('Please provide all required fields: name, photoURL, manifesto, department, level, category', 400)
    );
  }

  // Check if category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError('Category not found', 404));
  }

  const candidate = await Candidate.create({
    name,
    photoURL,
    manifesto,
    department,
    level,
    category,
  });

  // Populate category before sending response
  await candidate.populate('category', 'title description');

  res.status(201).json({
    status: 'success',
    data: {
      candidate,
    },
  });
});

/**
 * @route   PATCH /api/admin/candidates/:id
 * @desc    Update candidate
 * @access  Private (Admin)
 */
exports.updateCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate('category');

  if (!candidate) {
    return next(new AppError('No candidate found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      candidate,
    },
  });
});

/**
 * @route   DELETE /api/admin/candidates/:id
 * @desc    Delete candidate
 * @access  Private (Admin)
 */
exports.deleteCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);

  if (!candidate) {
    return next(new AppError('No candidate found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
