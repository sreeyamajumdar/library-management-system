const express = require('express');
const LibrarySession = require('../models/LibrarySession');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/sessions/checkin
 * Check the current user into the library.
 * Creates a new active session. Prevents duplicate check-ins.
 * Protected route.
 */
router.post('/checkin', auth, async (req, res) => {
  try {
    // Check if user already has an active session
    const existingSession = await LibrarySession.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (existingSession) {
      return res.status(400).json({ message: 'You are already checked into the library.' });
    }

    // Create a new active session
    const session = new LibrarySession({ user: req.user._id });
    await session.save();

    res.status(201).json({
      message: `Welcome to the library, ${req.user.name}!`,
      session,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error during check-in.' });
  }
});

/**
 * POST /api/sessions/checkout
 * Check the current user out of the library.
 * Closes the active session by setting checkOutTime and isActive=false.
 * Protected route.
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    // Find the user's active session
    const session = await LibrarySession.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (!session) {
      return res.status(400).json({ message: 'You are not currently checked into the library.' });
    }

    // Close the session
    session.checkOutTime = new Date();
    session.isActive = false;
    await session.save();

    res.json({
      message: `Goodbye, ${req.user.name}! See you next time.`,
      session,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Server error during check-out.' });
  }
});

/**
 * GET /api/sessions/active-count
 * Get the number of people currently in the library.
 * Public route — no auth required.
 */
router.get('/active-count', async (req, res) => {
  try {
    const count = await LibrarySession.countDocuments({ isActive: true });
    res.json({ count, activeCount: count });
  } catch (error) {
    console.error('Active count error:', error);
    res.status(500).json({ message: 'Server error fetching active count.' });
  }
});

/**
 * GET /api/sessions/my-status
 * Check whether the current user is checked into the library.
 * Protected route.
 */
router.get('/my-status', auth, async (req, res) => {
  try {
    const activeSession = await LibrarySession.findOne({
      user: req.user._id,
      isActive: true,
    });

    res.json({
      isCheckedIn: !!activeSession,
      session: activeSession || null,
    });
  } catch (error) {
    console.error('My status error:', error);
    res.status(500).json({ message: 'Server error fetching status.' });
  }
});

module.exports = router;
