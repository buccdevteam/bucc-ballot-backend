/**
 * Vote Controller
 */

const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const User = require('../models/User');
const ValidVoter = require('../models/ValidVoter');
const Category = require('../models/Category');
const Candidate = require('../models/Candidate');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { resolveSenatorEligibleRosterDepartment } = require('../utils/senatorEligibility');

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
  // #region agent log
  const _t0 = Date.now();
  // #endregion
  const validVoter = await ValidVoter.findOne({
    matricNumber: matricUpper,
    department: { $regex: new RegExp(`^${DEFAULT_ELIGIBILITY_DEPARTMENT}$`, 'i') },
  });
  // #region agent log
  fetch('http://127.0.0.1:7799/ingest/b081a051-05a3-4288-8ed4-9ae9e74f4251',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aebaeb'},body:JSON.stringify({sessionId:'aebaeb',location:'voteController.js:checkVotingEligibility',message:'ValidVoter regex query',data:{queryMs:Date.now()-_t0,found:!!validVoter,matricUpper,department:DEFAULT_ELIGIBILITY_DEPARTMENT},timestamp:Date.now(),hypothesisId:'H-D'})}).catch(()=>{});
  // #endregion
  if (!validVoter) {
    return { canVote: false, reason: 'Your matric number is not in the list of eligible voters for this election. Please contact support if you believe this is an error.' };
  }
  return { canVote: true };
}

/**
 * @route   POST /api/votes/bulk
 * @desc    Cast all votes in a single request
 * @access  Private (User)
 */
exports.castBulkVotes = catchAsync(async (req, res, next) => {
  const { votes } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(votes) || votes.length === 0) {
    return next(new AppError('votes must be a non-empty array', 400));
  }

  // Check for duplicate categoryIds in the request itself
  const requestCategoryIds = votes.map((v) => v.categoryId);
  if (new Set(requestCategoryIds).size !== requestCategoryIds.length) {
    return next(new AppError('Duplicate category entries in the request', 400));
  }

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

  // Fetch all categories and candidates in parallel
  const [allActiveCategories, allCandidates] = await Promise.all([
    Category.find({ isActive: true }),
    Candidate.find({ category: { $in: requestCategoryIds } }),
  ]);

  const activeCategoryMap = new Map(allActiveCategories.map((c) => [c._id.toString(), c]));
  const candidateMap = new Map(allCandidates.map((c) => [c._id.toString(), c]));

  // Validate each vote entry
  for (const v of votes) {
    if (!v.categoryId) {
      return next(new AppError('Each vote must include a categoryId', 400));
    }
    const category = activeCategoryMap.get(v.categoryId);
    if (!category) {
      return next(new AppError(`Category not found or inactive: ${v.categoryId}`, 404));
    }
    if (v.candidateId) {
      const candidate = candidateMap.get(v.candidateId);
      if (!candidate) {
        return next(new AppError(`Candidate not found: ${v.candidateId}`, 404));
      }
      if (candidate.category.toString() !== v.categoryId) {
        return next(new AppError(`Candidate does not belong to the specified category`, 400));
      }
    } else if (!category.allowAbstain) {
      return next(new AppError(`Category "${category.title}" does not allow abstain votes`, 400));
    }
  }

  // Check if user has already voted in any of these categories
  const existingVotes = await Vote.find({ user: userId, category: { $in: requestCategoryIds } });
  if (existingVotes.length > 0) {
    const already = existingVotes.map((v) => activeCategoryMap.get(v.category.toString())?.title || v.category).join(', ');
    return next(new AppError(`You have already voted in: ${already}`, 400));
  }

  // Build vote documents and insert all at once
  const voteDocs = votes.map((v) => ({
    user: userId,
    category: v.categoryId,
    candidate: v.candidateId || null,
    isAbstain: !v.candidateId,
  }));

  const createdVotes = await Vote.insertMany(voteDocs, { ordered: true });

  // Mark user as hasVoted if they've voted in all voteable categories (active + have candidates)
  const voteableCategoryIds = await Candidate.distinct('category');
  const voteableCount = await Category.countDocuments({
    _id: { $in: voteableCategoryIds },
    isActive: true,
  });
  const totalUserVotes = await Vote.countDocuments({ user: userId });
  if (voteableCount > 0 && totalUserVotes >= voteableCount) {
    await User.findByIdAndUpdate(userId, { hasVoted: true });
  }

  res.status(201).json({
    status: 'success',
    results: createdVotes.length,
    data: { votes: createdVotes },
  });
});

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
      { path: 'user', select: 'email name matricNumber' },
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

async function getValidVoterMatricSet(rosterDepartmentLabel) {
  const escaped = String(rosterDepartmentLabel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const voters = await ValidVoter.find({
    department: new RegExp(`^${escaped}$`, 'i'),
  })
    .select('matricNumber')
    .lean();

  return new Set(
    voters
      .map((v) => String(v.matricNumber || '').toUpperCase().trim())
      .filter(Boolean)
  );
}

function countVotesFromDocuments(votes) {
  const voteCounts = {
    total: votes.length,
    abstain: votes.filter((v) => v.isAbstain).length,
    candidates: {},
  };

  votes.forEach((vote) => {
    if (!vote.isAbstain && vote.candidate) {
      const candidateId = vote.candidate._id.toString();
      voteCounts.candidates[candidateId] = (voteCounts.candidates[candidateId] || 0) + 1;
    }
  });

  return voteCounts;
}

function voteMatchesLegibleRoster(voteDoc, rosterDepartment, matricSet) {
  if (!rosterDepartment) return true;
  if (!matricSet || matricSet.size === 0) return false;
  const u = voteDoc.user;
  if (!u || typeof u !== 'object') return false;
  const m = String(u.matricNumber || '').toUpperCase().trim();
  if (!m) return false;
  return matricSet.has(m);
}

function paginateArray(arr, page, limit) {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: arr.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

function voteToJsonWithLegible(voteDoc, rosterDepartment, matricSet, annotate) {
  const base = typeof voteDoc.toObject === 'function' ? voteDoc.toObject() : { ...voteDoc };
  if (!annotate) return base;
  return {
    ...base,
    isLegible: voteMatchesLegibleRoster(voteDoc, rosterDepartment, matricSet),
  };
}

async function computeVoteCountsAggregate(categoryId) {
  const catOid = new mongoose.Types.ObjectId(String(categoryId));
  const total = await Vote.countDocuments({ category: categoryId });
  const abstain = await Vote.countDocuments({ category: categoryId, isAbstain: true });
  const agg = await Vote.aggregate([
    {
      $match: {
        category: catOid,
        isAbstain: false,
        candidate: { $ne: null },
      },
    },
    { $group: { _id: '$candidate', count: { $sum: 1 } } },
  ]);
  const candidates = {};
  agg.forEach((row) => {
    if (row._id) candidates[row._id.toString()] = row.count;
  });
  return { total, abstain, candidates };
}

/** Votes tied to candidate ids that are no longer on the ballot (e.g. deleted candidates). */
function buildRemovedCandidateSegments(voteCountsCandidates, liveCandidateIdSet) {
  const segments = [];
  let total = 0;
  for (const [candidateId, count] of Object.entries(voteCountsCandidates || {})) {
    if (!liveCandidateIdSet.has(candidateId)) {
      total += count;
      segments.push({ candidateId, count });
    }
  }
  segments.sort((a, b) => b.count - a.count);
  return { total, segments };
}

function segmentsFromVoteDocuments(votes) {
  const tallies = new Map();
  for (const v of votes) {
    const cid = v.candidate ? v.candidate.toString() : null;
    if (!cid) continue;
    tallies.set(cid, (tallies.get(cid) || 0) + 1);
  }
  const segments = [...tallies.entries()].map(([candidateId, count]) => ({
    candidateId,
    count,
  }));
  segments.sort((a, b) => b.count - a.count);
  const total = segments.reduce((s, x) => s + x.count, 0);
  return { total, segments };
}

/**
 * @route   GET /api/admin/votes/category/:categoryId
 * @query   countsOnly - if true, only aggregates + eligibility (no vote rows)
 * @query   eligibleOnly - if true, only votes whose matric appears on the senator roster (when rule applies)
 * @query   page, limit - pagination per candidate / abstain block (default page=1, limit=20)
 * @desc    Get votes for a specific category (admin only)
 * @access  Private (Admin)
 */
exports.getVotesByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const countsOnly = req.query.countsOnly === 'true' || req.query.countsOnly === '1';
  const eligibleOnly = req.query.eligibleOnly === 'true' || req.query.eligibleOnly === '1';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const rosterDepartment = resolveSenatorEligibleRosterDepartment(category.title);
  const ruleApplies = !!rosterDepartment;

  let matricSet = null;
  if (ruleApplies) {
    matricSet = await getValidVoterMatricSet(rosterDepartment);
  }

  const voteCounts = await computeVoteCountsAggregate(categoryId);

  let eligibleVoteCounts = null;
  if (ruleApplies) {
    const leanVotes = await Vote.find({ category: categoryId })
      .populate([
        { path: 'user', select: 'matricNumber' },
        { path: 'candidate', select: '_id' },
      ])
      .lean();
    const legible = leanVotes.filter((v) =>
      voteMatchesLegibleRoster(v, rosterDepartment, matricSet)
    );
    eligibleVoteCounts = countVotesFromDocuments(legible);
  }

  const eligibility = {
    rosterDepartment,
    ruleApplies,
  };

  const candidatesDocs = await Candidate.find({ category: categoryId }).sort({ name: 1 });
  const liveCandidateIdSet = new Set(candidatesDocs.map((c) => c._id.toString()));
  const removedCandidateVotesAll = buildRemovedCandidateSegments(
    voteCounts.candidates,
    liveCandidateIdSet
  );

  if (countsOnly) {
    return res.status(200).json({
      status: 'success',
      results: voteCounts.total,
      data: {
        category: {
          id: category._id,
          title: category.title,
          description: category.description,
        },
        voteCounts,
        eligibleVoteCounts,
        eligibility,
        candidates: [],
        abstain: null,
        removedCandidateVotes:
          removedCandidateVotesAll.total > 0 ? removedCandidateVotesAll : null,
      },
    });
  }

  const allVotes = await Vote.find({ category: categoryId })
    .populate([
      { path: 'user', select: 'email name matricNumber' },
      { path: 'candidate', select: 'name photoURL' },
    ])
    .sort({ createdAt: -1 });

  let workingVotes = allVotes;
  if (eligibleOnly && ruleApplies) {
    workingVotes = allVotes.filter((v) =>
      voteMatchesLegibleRoster(v, rosterDepartment, matricSet)
    );
  }

  const liveIds = candidatesDocs.map((c) => c._id);
  const removedVoteDocs = await Vote.find({
    category: categoryId,
    isAbstain: false,
    candidate: { $ne: null, $nin: liveIds },
  })
    .populate([{ path: 'user', select: 'email name matricNumber' }])
    .sort({ createdAt: -1 });

  let workingRemovedVotes = removedVoteDocs;
  if (eligibleOnly && ruleApplies) {
    workingRemovedVotes = removedVoteDocs.filter((v) =>
      voteMatchesLegibleRoster(v, rosterDepartment, matricSet)
    );
  }

  const removedCandidateVotes =
    eligibleOnly && ruleApplies
      ? segmentsFromVoteDocuments(workingRemovedVotes)
      : removedCandidateVotesAll;

  const byCandidate = new Map();
  candidatesDocs.forEach((c) => byCandidate.set(c._id.toString(), []));

  const abstainList = [];
  workingVotes.forEach((v) => {
    if (v.isAbstain) {
      abstainList.push(v);
      return;
    }
    if (v.candidate) {
      const id = v.candidate._id.toString();
      if (!byCandidate.has(id)) byCandidate.set(id, []);
      byCandidate.get(id).push(v);
    }
  });

  const annotateLegible = ruleApplies && !eligibleOnly;

  const candidatesPayload = candidatesDocs.map((c) => {
    const list = byCandidate.get(c._id.toString()) || [];
    const paginated = paginateArray(list, page, limit);
    return {
      candidate: { id: c._id, name: c.name },
      votes: paginated.items.map((v) =>
        voteToJsonWithLegible(v, rosterDepartment, matricSet, annotateLegible)
      ),
      pagination: {
        page: paginated.page,
        limit: paginated.limit,
        total: paginated.total,
        totalPages: paginated.totalPages,
      },
    };
  });

  let abstainPayload = null;
  if (category.allowAbstain !== false) {
    const paginatedAbstain = paginateArray(abstainList, page, limit);
    abstainPayload = {
      votes: paginatedAbstain.items.map((v) =>
        voteToJsonWithLegible(v, rosterDepartment, matricSet, annotateLegible)
      ),
      pagination: {
        page: paginatedAbstain.page,
        limit: paginatedAbstain.limit,
        total: paginatedAbstain.total,
        totalPages: paginatedAbstain.totalPages,
      },
    };
  }

  let removedCandidatePayload = null;
  if (removedCandidateVotes.total > 0) {
    const paginatedRemoved = paginateArray(workingRemovedVotes, page, limit);
    removedCandidatePayload = {
      votes: paginatedRemoved.items.map((v) => {
        const base = voteToJsonWithLegible(
          v,
          rosterDepartment,
          matricSet,
          annotateLegible
        );
        const rid = v.candidate ? v.candidate.toString() : null;
        return rid ? { ...base, removedCandidateId: rid } : base;
      }),
      pagination: {
        page: paginatedRemoved.page,
        limit: paginatedRemoved.limit,
        total: paginatedRemoved.total,
        totalPages: paginatedRemoved.totalPages,
      },
    };
  }

  return res.status(200).json({
    status: 'success',
    results: voteCounts.total,
    data: {
      category: {
        id: category._id,
        title: category.title,
        description: category.description,
      },
      voteCounts,
      eligibleVoteCounts,
      eligibility,
      eligibleOnlyActive: !!(eligibleOnly && ruleApplies),
      candidates: candidatesPayload,
      abstain: abstainPayload,
      removedCandidateVotes:
        removedCandidateVotes.total > 0 ? removedCandidateVotes : null,
      removedCandidateBallots: removedCandidatePayload,
    },
  });
});
