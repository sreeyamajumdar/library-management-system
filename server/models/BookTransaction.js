const mongoose = require('mongoose');

/**
 * BookTransaction Schema
 * Tracks book borrow and return operations.
 */
const bookTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book reference is required'],
  },
  borrowDate: {
    type: Date,
    default: Date.now,
  },
  returnDate: {
    type: Date,
    default: null,
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  isPendingReturn: {
    type: Boolean,
    default: false,
  },
  returnRequestedAt: {
    type: Date,
    default: null,
  },
  fineAmount: {
    type: Number,
    default: 0,
  },
  finePaid: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('BookTransaction', bookTransactionSchema);
