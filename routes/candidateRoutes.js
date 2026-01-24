/**
 * Candidate Routes
 */

const express = require('express');
const { body } = require('express-validator');
const {
  getAllCandidates,
  getCandidatesByCategory,
  getAllCandidatesAdmin,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} = require('../controllers/candidateController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getAllCandidates);
router.get('/category/:categoryId', getCandidatesByCategory);

// Admin routes (require authentication)
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(restrictTo('admin', 'super-admin'));

// Validation rules
const createCandidateValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Candidate name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('photoURL')
    .trim()
    .notEmpty()
    .withMessage('Photo URL is required')
    .isURL()
    .withMessage('Photo URL must be a valid URL'),
  body('manifesto')
    .trim()
    .notEmpty()
    .withMessage('Manifesto is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Manifesto must be between 10 and 2000 characters'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('level')
    .trim()
    .notEmpty()
    .withMessage('Level is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Level must be between 2 and 50 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),
];

const updateCandidateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('photoURL')
    .optional()
    .trim()
    .isURL()
    .withMessage('Photo URL must be a valid URL'),
  body('manifesto')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Manifesto must be between 10 and 2000 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('level')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Level must be between 2 and 50 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),
];

// Admin routes
adminRouter
  .route('/')
  .get(getAllCandidatesAdmin)
  .post(createCandidateValidation, validate, createCandidate);

adminRouter
  .route('/:id')
  .get(getCandidate)
  .patch(updateCandidateValidation, validate, updateCandidate)
  .delete(deleteCandidate);

module.exports = { publicRouter: router, adminRouter };
