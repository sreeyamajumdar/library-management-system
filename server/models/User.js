const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents a library member with one of three distinct roles:
 * - Student
 * - Teacher
 * - Admin (Librarian)
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    position: {
      type: String,
      enum: {
        values: ['Student', 'Teacher', 'Admin'],
        message: 'Position must be Student, Teacher, or Admin',
      },
      required: [true, 'Position is required'],
      default: 'Student',
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      lowercase: true,
    },
    department: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          // Department is required for students and teachers, optional for admins
          if (this.position === 'Admin') return true;
          return typeof val === 'string' && val.trim().length > 0;
        },
        message: 'Department is required for students and faculty members',
      },
    },
    // Student unique identifier
    enrollmentNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    // Teacher unique identifier
    facultyId: {
      type: String,
      trim: true,
      sparse: true,
    },
    // Admin unique identifier
    adminId: {
      type: String,
      trim: true,
      sparse: true,
    },
    // Email (optional for students, used for teachers/admins)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    // Password (hashed with bcrypt)
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-save hook to hash password and sync role
userSchema.pre('save', async function (next) {
  // Sync lowercase role with position
  if (this.position) {
    this.role = this.position.toLowerCase();
  }

  // Hash password if modified
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

/**
 * Compare entered password with stored hashed password.
 * Supports backward-compatibility for legacy accounts without a password.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // If user has no password set yet (legacy student account)
  if (!this.password) {
    return true;
  }
  if (!candidatePassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
