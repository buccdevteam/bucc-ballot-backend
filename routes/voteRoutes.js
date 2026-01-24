/**
 * Vote Routes
 */

const express = require('express');
const { body } = require('express-validator');
const {
  castVote,
  getMyVotes,
  getVotingStatus,
  getAllVotes,
  getVotesByCategory,
} = require('../controllers/voteController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User routes
const castVoteValidation = [
  body('categoryId')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ID'),
  body('candidateId')
    .optional()
    .isMongoId()
    .withMessage('Candidate ID must be a valid MongoDB ID'),
];

router.post('/', castVoteValidation, validate, castVote);
router.get('/me', getMyVotes);
router.get('/status', getVotingStatus);

// Admin routes
const adminRouter = express.Router();
adminRouter.use(restrictTo('admin', 'super-admin'));

adminRouter.get('/', getAllVotes);
adminRouter.get('/category/:categoryId', getVotesByCategory);

module.exports = { publicRouter: router, adminRouter };
