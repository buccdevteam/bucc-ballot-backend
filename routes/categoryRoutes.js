/**
 * Category Routes (Admin)
 */

const express = require('express');
const { body } = require('express-validator');
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin', 'super-admin'));

// Validation rules
const createCategoryValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Category title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Category description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('allowAbstain')
    .optional()
    .isBoolean()
    .withMessage('allowAbstain must be a boolean'),
];

const updateCategoryValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('allowAbstain')
    .optional()
    .isBoolean()
    .withMessage('allowAbstain must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Routes
router
  .route('/')
  .get(getAllCategories)
  .post(createCategoryValidation, validate, createCategory);

router
  .route('/:id')
  .get(getCategory)
  .patch(updateCategoryValidation, validate, updateCategory)
  .delete(deleteCategory);

module.exports = router;
