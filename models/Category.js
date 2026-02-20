/**
 * Category Model
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide category title'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide category description'],
    trim: true,
  },
  allowAbstain: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
categorySchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Virtual populate for candidates
categorySchema.virtual('candidates', {
  ref: 'Candidate',
  localField: '_id',
  foreignField: 'category',
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
