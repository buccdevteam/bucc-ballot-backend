/**
 * ValidVoter Model
 * Stores the list of students eligible to vote, grouped by department
 */

const mongoose = require('mongoose');

const validVoterSchema = new mongoose.Schema({
  matricNumber: {
    type: String,
    required: [true, 'Matric number is required'],
    trim: true,
    uppercase: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index: one matric number per department (same student can be in multiple depts)
validVoterSchema.index({ matricNumber: 1, department: 1 }, { unique: true });

const ValidVoter = mongoose.model('ValidVoter', validVoterSchema);

module.exports = ValidVoter;
