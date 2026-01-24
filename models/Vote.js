/**
 * Vote Model
 */

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vote must belong to a user'],
    index: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Vote must belong to a category'],
    index: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null, // null means abstain
  },
  isAbstain: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one vote per user per category
voteSchema.index({ user: 1, category: 1 }, { unique: true });

// Index for faster queries
voteSchema.index({ category: 1, candidate: 1 });

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
