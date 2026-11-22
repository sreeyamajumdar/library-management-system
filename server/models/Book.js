const mongoose = require('mongoose');

/**
 * Book Schema
 * Represents a book in the library inventory.
 * Supports semester/course associations and edition tracking.
 */
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
  },
  isbn: {
    type: String,
    trim: true,
    default: null,
  },
  edition: {
    type: String,
    trim: true,
  },
  genre: {
    type: String,
    trim: true,
  },
  semester: {
    type: [Number],
    default: [],
  },
  courses: [{
    courseCode: { type: String, trim: true },
    courseName: { type: String, trim: true },
  }],
  totalCopies: {
    type: Number,
    default: 1,
    min: [0, 'Total copies cannot be negative'],
  },
  availableCopies: {
    type: Number,
    default: 1,
    min: [0, 'Available copies cannot be negative'],
  },
  borrowedCopies: {
    type: Number,
    default: 0,
    min: [0, 'Borrowed copies cannot be negative'],
  },
  alternateIsbns: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
  coverImage: {
    type: String,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a unique index on isbn, but only for non-null values
bookSchema.index({ isbn: 1 }, { unique: true, sparse: true });

// Text index for search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

module.exports = mongoose.model('Book', bookSchema);
