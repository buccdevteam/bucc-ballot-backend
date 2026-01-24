/**
 * Candidate Model
 */

const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide candidate name'],
    trim: true,
  },
  photoURL: {
    type: String,
    required: [true, 'Please provide a photo URL'],
    trim: true,
  },
  manifesto: {
    type: String,
    required: [true, 'Please provide a manifesto'],
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true,
  },
  level: {
    type: String,
    required: [true, 'Please provide level'],
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Candidate must belong to a category'],
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
candidateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
