/**
 * Vote Routes
 */

const express = require('express');
const { body } = require('express-validator');
const {
  castVote,
  castBulkVotes,
  getMyVotes,
  getVotingStatus,
  getVotingEligibility,
  getAllVotes,
  getVotesByCategory,
  getVoteStats,
} = require('../controllers/voteController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User routes
const castVoteValidation = [
  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ID'),
  body('candidateId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return /^[a-fA-F0-9]{24}$/.test(String(value));
    })
    .withMessage('Candidate ID must be a valid MongoDB ID when provided'),
];

const castBulkVotesValidation = [
  body('votes')
    .isArray({ min: 1 })
    .withMessage('votes must be a non-empty array'),
  body('votes.*.categoryId')
    .trim()
    .notEmpty()
    .withMessage('categoryId is required for each vote')
    .isMongoId()
    .withMessage('categoryId must be a valid MongoDB ID'),
  body('votes.*.candidateId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return /^[a-fA-F0-9]{24}$/.test(String(value));
    })
    .withMessage('candidateId must be a valid MongoDB ID when provided'),
];

router.post('/', castVoteValidation, validate, castVote);
router.post('/bulk', castBulkVotesValidation, validate, castBulkVotes);
router.get('/me', getMyVotes);
router.get('/status', getVotingStatus);
router.get('/eligibility', getVotingEligibility);

// Admin routes (require protect first to set req.user, then restrictTo for role check)
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(restrictTo('admin', 'super-admin'));

adminRouter.get('/', getAllVotes);
adminRouter.get('/stats', getVoteStats);
adminRouter.get('/category/:categoryId', getVotesByCategory);

module.exports = { publicRouter: router, adminRouter };
