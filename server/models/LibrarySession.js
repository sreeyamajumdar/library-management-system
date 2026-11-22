const mongoose = require('mongoose');

/**
 * LibrarySession Schema
 * Tracks users entering and leaving the physical library.
 * An active session means the user is currently in the library.
 */
const librarySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  checkInTime: {
    type: Date,
    default: Date.now,
  },
  checkOutTime: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('LibrarySession', librarySessionSchema);
