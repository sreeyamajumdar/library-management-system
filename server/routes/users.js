const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/count
 * Return total number of users.
 */
router.get('/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Count users error:', error);
    res.status(500).json({ message: 'Server error counting users.' });
  }
});

/**
 * GET /api/users
 * List all users. Supports search by name, department, or enrollmentNumber.
 * Protected route.
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { department: searchRegex },
          { enrollmentNumber: searchRegex },
          { position: searchRegex },
        ],
      };
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({ count: users.length, users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

module.exports = router;
