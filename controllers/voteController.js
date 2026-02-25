/**
 * Vote Controller
 */

const Vote = require('../models/Vote');
const User = require('../models/User');
const ValidVoter = require('../models/ValidVoter');
const Category = require('../models/Category');
const Candidate = require('../models/Candidate');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

const DEFAULT_ELIGIBILITY_DEPARTMENT = 'bucc';
const VALID_EMAIL_DOMAIN = '@student.babcock.edu.ng';

/**
 * Check if user is eligible to vote (matric in valid list + student email)
 */
async function checkVotingEligibility(user) {
  if (!user.email || !user.email.toLowerCase().includes(VALID_EMAIL_DOMAIN)) {
    return { canVote: false, reason: 'Only Babcock University student emails (@student.babcock.edu.ng) are eligible to vote.' };
  }
  if (!user.matricNumber || !user.matricNumber.trim()) {
    return { canVote: false, reason: 'Matric number is required to vote. Please complete your profile.' };
  }
  const matricUpper = user.matricNumber.trim().toUpperCase();
  const validVoter = await ValidVoter.findOne({
    matricNumber: matricUpper,
    department: { $regex: new RegExp(`^${DEFAULT_ELIGIBILITY_DEPARTMENT}$`, 'i') },
  });
  if (!validVoter) {
    return { canVote: false, reason: 'Your matric number is not in the list of eligible voters for this election. Please contact support if you believe this is an error.' };
  }
  return { canVote: true };
}

/**
 * @route   GET /api/votes/eligibility
 * @desc    Check if current user is eligible to vote
 * @access  Private (User)
 */
exports.getVotingEligibility = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      status: 'success',
      data: { canVote: false, reason: 'User not found.' },
    });
  }
  const eligibility = await checkVotingEligibility(user);
  res.status(200).json({
    status: 'success',
    data: eligibility,
  });
});

/**
 * @route   POST /api/votes
 * @desc    Cast a vote
 * @access  Private (User)
 */
exports.castVote = catchAsync(async (req, res, next) => {
  const { categoryId, candidateId } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!categoryId) {
    return next(new AppError('Category ID is required', 400));
  }

  // Check if user exists and has matric number
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  if (!user.matricNumber || !user.matricNumber.trim()) {
    return next(new AppError('Matric number is required to cast a vote. Please complete your profile.', 403));
  }

  const eligibility = await checkVotingEligibility(user);
  if (!eligibility.canVote) {
    return next(new AppError(eligibility.reason || 'You are not eligible to vote.', 403));
  }

  // Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Check if user has already voted in this category
  const existingVote = await Vote.findOne({ user: userId, category: categoryId });
  if (existingVote) {
    return next(new AppError('You have already voted in this category', 400));
  }

  // If candidateId is provided, validate it
  if (candidateId) {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return next(new AppError('Candidate not found', 404));
    }

    // Verify candidate belongs to the category
    if (candidate.category.toString() !== categoryId) {
      return next(new AppError('Candidate does not belong to this category', 400));
    }
  } else {
    // Abstain vote - check if category allows abstain
    if (!category.allowAbstain) {
      return next(new AppError('This category does not allow abstain votes', 400));
    }
  }

  // Create vote
  const vote = await Vote.create({
    user: userId,
    category: categoryId,
    candidate: candidateId || null,
    isAbstain: !candidateId,
  });

  // Check if user has voted in all categories
  const allCategories = await Category.find({ isActive: true });
  const userVotes = await Vote.find({ user: userId });
  
  // If user has voted in all active categories, mark hasVoted as true
  if (userVotes.length >= allCategories.length) {
    user.hasVoted = true;
    await user.save();
  }

  // Populate vote details
  await vote.populate([
    { path: 'category', select: 'title description' },
    { path: 'candidate', select: 'name photoURL' },
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      vote,
    },
  });
});

/**
 * @route   GET /api/votes/me
 * @desc    Get current user's votes
 * @access  Private (User)
 */
exports.getMyVotes = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const votes = await Vote.find({ user: userId })
    .populate([
      { path: 'category', select: 'title description allowAbstain' },
      { path: 'candidate', select: 'name photoURL department level' },
    ])
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: votes.length,
    data: {
      votes,
    },
  });
});

/**
 * @route   GET /api/votes/status
 * @desc    Get voting status for current user
 * @access  Private (User)
 */
exports.getVotingStatus = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  const allCategories = await Category.find({ isActive: true });
  const userVotes = await Vote.find({ user: userId });

  const categoriesWithVoteStatus = await Promise.all(
    allCategories.map(async (category) => {
      const vote = await Vote.findOne({ user: userId, category: category._id })
        .populate('candidate', 'name');
      
      return {
        category: {
          id: category._id,
          title: category.title,
          description: category.description,
          allowAbstain: category.allowAbstain,
        },
        hasVoted: !!vote,
        vote: vote ? {
          candidateId: vote.candidate?._id || null,
          candidateName: vote.candidate?.name || null,
          isAbstain: vote.isAbstain,
        } : null,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      hasVoted: user.hasVoted,
      totalCategories: allCategories.length,
      votesCast: userVotes.length,
      categories: categoriesWithVoteStatus,
    },
  });
});

/**
 * @route   GET /api/admin/votes
 * @desc    Get all votes (admin only)
 * @access  Private (Admin)
 */
exports.getAllVotes = catchAsync(async (req, res) => {
  const votes = await Vote.find()
    .populate([
      { path: 'user', select: 'email name' },
      { path: 'category', select: 'title' },
      { path: 'candidate', select: 'name' },
    ])
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: votes.length,
    data: {
      votes,
    },
  });
});

/**
 * @route   GET /api/admin/votes/stats
 * @desc    Get vote statistics (admin only)
 * @access  Private (Admin)
 */
exports.getVoteStats = catchAsync(async (req, res) => {
  const votes = await Vote.find()
    .populate('category', 'title')
    .populate('candidate', 'name');

  const totalVotes = votes.length;

  const categoryBreakdown = {};
  const candidateBreakdown = {};

  votes.forEach((vote) => {
    const categoryId = vote.category?._id?.toString();
    const categoryTitle = vote.category?.title || 'Unknown';

    if (categoryId) {
      categoryBreakdown[categoryTitle] = (categoryBreakdown[categoryTitle] || 0) + 1;
    }

    if (!vote.isAbstain && vote.candidate) {
      const candidateName = vote.candidate.name;
      candidateBreakdown[candidateName] = (candidateBreakdown[candidateName] || 0) + 1;
    }
  });

  const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, votes]) => ({
    category,
    votes,
  }));

  const candidateBreakdownArray = Object.entries(candidateBreakdown).map(([candidate, votes]) => ({
    candidate,
    votes,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      totalVotes,
      categoryBreakdown: categoryBreakdownArray,
      candidateBreakdown: candidateBreakdownArray,
    },
  });
});

/**
 * @route   GET /api/admin/votes/category/:categoryId
 * @desc    Get votes for a specific category (admin only)
 * @access  Private (Admin)
 */
exports.getVotesByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const votes = await Vote.find({ category: categoryId })
    .populate([
      { path: 'user', select: 'email name' },
      { path: 'candidate', select: 'name photoURL' },
    ])
    .sort({ createdAt: -1 });

  // Calculate vote counts
  const voteCounts = {
    total: votes.length,
    abstain: votes.filter(v => v.isAbstain).length,
    candidates: {},
  };

  votes.forEach(vote => {
    if (!vote.isAbstain && vote.candidate) {
      const candidateId = vote.candidate._id.toString();
      voteCounts.candidates[candidateId] = (voteCounts.candidates[candidateId] || 0) + 1;
    }
  });

  res.status(200).json({
    status: 'success',
    results: votes.length,
    data: {
      category: {
        id: category._id,
        title: category.title,
        description: category.description,
      },
      votes,
      voteCounts,
    },
  });
});
