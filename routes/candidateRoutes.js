/**
 * Candidate Routes
 * Uses multipart/form-data for create/update - photos go to Cloudinary, not base64.
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
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getAllCandidates);
router.get('/category/:categoryId', getCandidatesByCategory);

// Admin routes (require authentication)
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(restrictTo('admin', 'super-admin'));

// Validation rules for create (photo comes from file upload, not body)
const createCandidateValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Candidate name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
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

// Validation rules for update (all fields optional; photo from file if provided)
const updateCandidateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
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

// Admin routes with upload middleware for create/update
adminRouter
  .route('/')
  .get(getAllCandidatesAdmin)
  .post(upload.single('photo'), createCandidateValidation, validate, createCandidate);

adminRouter
  .route('/:id')
  .get(getCandidate)
  .patch(upload.single('photo'), updateCandidateValidation, validate, updateCandidate)
  .delete(deleteCandidate);

module.exports = { publicRouter: router, adminRouter };
