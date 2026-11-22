const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a JWT token for a given user ID.
 * Token expires in 2 hours — session should not last longer.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '2h' });
};

/**
 * POST /api/auth/register
 * Register a new user.
 * Body: { name, department, position, enrollmentNumber }
 * Returns: JWT token + user data
 */
router.post('/register', async (req, res) => {
  try {
    const { name, department, position, enrollmentNumber } = req.body;

    // Check if enrollment number already exists
    const existingUser = await User.findOne({ enrollmentNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this enrollment number already exists.' });
    }

    // Create new user
    const user = new User({ name, department, position, enrollmentNumber });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: `Registration successful. Welcome, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        department: user.department,
        position: user.position,
        enrollmentNumber: user.enrollmentNumber,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Login by enrollment number.
 * Body: { enrollmentNumber }
 * Returns: JWT token + user data + welcome message
 */
router.post('/login', async (req, res) => {
  try {
    const { enrollmentNumber } = req.body;

    if (!enrollmentNumber) {
      return res.status(400).json({ message: 'Enrollment number is required.' });
    }

    // Find user by enrollment number
    const user = await User.findOne({ enrollmentNumber });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this enrollment number.' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: `Welcome, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        department: user.department,
        position: user.position,
        enrollmentNumber: user.enrollmentNumber,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 * Protected route — requires valid JWT.
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        department: req.user.department,
        position: req.user.position,
        enrollmentNumber: req.user.enrollmentNumber,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

module.exports = router;
