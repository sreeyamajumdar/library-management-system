const mongoose = require('mongoose');

/**
 * User Schema
 * Represents a library member (student, teacher, or admin).
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  position: {
    type: String,
    enum: {
      values: ['Student', 'Teacher', 'Admin'],
      message: 'Position must be Student, Teacher, or Admin',
    },
    required: [true, 'Position is required'],
  },
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment number is required'],
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
