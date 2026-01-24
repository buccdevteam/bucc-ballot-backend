/**
 * User Model
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  photoURL: {
    type: String,
  },
  matricNumber: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  provider: {
    type: String,
    enum: ['google', 'credentials'],
    default: 'google',
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  hasVoted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
});

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
