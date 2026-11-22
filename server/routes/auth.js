const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a JWT token for a given user.
 * Encodes userId and user role.
 * Token expires in 2 hours — session strictly limited to 2 hours.
 */
const generateToken = (user) => {
  const role = (user.position || user.role || 'student').toLowerCase();
  return jwt.sign(
    {
      userId: user._id,
      role,
      position: user.position,
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
};

// Helper to format public user profile safely
const formatUserProfile = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  department: user.department,
  position: user.position,
  role: (user.position || user.role || 'student').toLowerCase(),
  enrollmentNumber: user.enrollmentNumber,
  facultyId: user.facultyId,
  adminId: user.adminId,
  email: user.email,
  createdAt: user.createdAt,
});

/**
 * POST /api/auth/register
 * Student public registration.
 * Role is strictly enforced as 'Student' on the backend to prevent privilege escalation.
 * Body: { name, department, enrollmentNumber, password? }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, department, enrollmentNumber, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ message: 'Department is required.' });
    }
    if (!enrollmentNumber || !enrollmentNumber.trim()) {
      return res.status(400).json({ message: 'Enrollment number is required.' });
    }

    const cleanEnrollment = enrollmentNumber.trim();

    // Check if enrollment number already exists
    const existingUser = await User.findOne({ enrollmentNumber: cleanEnrollment });
    if (existingUser) {
      return res.status(400).json({ message: 'A student account with this enrollment number already exists.' });
    }

    // Strictly enforce Student role — visitors cannot register as Teacher or Admin
    const user = new User({
      name: name.trim(),
      department: department.trim(),
      position: 'Student',
      role: 'student',
      enrollmentNumber: cleanEnrollment,
      ...(password && password.trim() ? { password: password.trim() } : {}),
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: `Registration successful. Welcome, ${user.name}!`,
      token,
      user: formatUserProfile(user),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/student/login
 * Dedicated Student Login.
 * Authenticates using Enrollment Number and optional Password (supports legacy student accounts).
 * Body: { enrollmentNumber, password? }
 */
router.post('/student/login', async (req, res) => {
  try {
    const { enrollmentNumber, password } = req.body;

    if (!enrollmentNumber || !enrollmentNumber.trim()) {
      return res.status(400).json({ message: 'Enrollment number is required.' });
    }

    const cleanEnrollment = enrollmentNumber.trim();
    const user = await User.findOne({ enrollmentNumber: cleanEnrollment });

    if (!user) {
      return res.status(404).json({ message: 'No student account found with this enrollment number.' });
    }

    // Role check
    if (user.position !== 'Student') {
      return res.status(403).json({
        message: `This account is registered as a ${user.position}. Please use the ${user.position} Login portal.`,
      });
    }

    // Password validation (backward-compatible with legacy student accounts)
    if (user.password) {
      if (!password) {
        return res.status(401).json({ message: 'Password is required for this account.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid enrollment number or password.' });
      }
    } else if (password && password.trim().length >= 6) {
      // If legacy student provided a new password, store it securely
      user.password = password.trim();
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: formatUserProfile(user),
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ message: 'Server error during student login.' });
  }
});

/**
 * POST /api/auth/login
 * Generic/Legacy Login endpoint (kept for backward compatibility with QR codes and existing links).
 * Supports student login and routes correctly.
 */
router.post('/login', async (req, res) => {
  try {
    const { enrollmentNumber, identifier, password } = req.body;
    const lookupId = (enrollmentNumber || identifier || '').trim();

    if (!lookupId) {
      return res.status(400).json({ message: 'Enrollment number or ID is required.' });
    }

    const user = await User.findOne({
      $or: [
        { enrollmentNumber: lookupId },
        { facultyId: lookupId },
        { adminId: lookupId },
        { email: lookupId.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this identifier.' });
    }

    // Check password if set
    if (user.password) {
      if (!password) {
        return res.status(401).json({ message: 'Password is required for this account.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
    } else if (password && password.trim().length >= 6) {
      user.password = password.trim();
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: formatUserProfile(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

/**
 * POST /api/auth/teacher/login
 * Dedicated Teacher Login.
 * Authenticates using Faculty ID (or Email / legacy identifier) and Password.
 * Body: { facultyId, password } or { identifier, password }
 */
router.post('/teacher/login', async (req, res) => {
  try {
    const { facultyId, identifier, email, password } = req.body;
    const lookupId = (facultyId || identifier || email || '').trim();

    if (!lookupId) {
      return res.status(400).json({ message: 'Faculty ID or Email is required.' });
    }

    // Query teacher
    const user = await User.findOne({
      $or: [
        { facultyId: lookupId },
        { email: lookupId.toLowerCase() },
        { enrollmentNumber: lookupId },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'No faculty account found with these credentials.' });
    }

    // Check role
    if (user.position !== 'Teacher') {
      return res.status(403).json({
        message: `This account is registered as a ${user.position}. Please use the ${user.position} Login portal.`,
      });
    }

    // Check password
    if (user.password) {
      if (!password) {
        return res.status(401).json({ message: 'Password is required.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid faculty ID or password.' });
      }
    } else if (password && password.trim().length >= 6) {
      // Legacy account password setup
      user.password = password.trim();
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: `Welcome, Professor ${user.name}!`,
      token,
      user: formatUserProfile(user),
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ message: 'Server error during teacher login.' });
  }
});

/**
 * POST /api/auth/admin/login
 * Dedicated Admin (Librarian) Login.
 * Authenticates using Admin ID or Email and Password.
 * Body: { adminId, email, identifier, password }
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { adminId, email, identifier, password } = req.body;
    const lookupId = (adminId || identifier || email || '').trim();

    if (!lookupId) {
      return res.status(400).json({ message: 'Admin ID or Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    // Query admin
    const user = await User.findOne({
      $or: [
        { adminId: lookupId },
        { email: lookupId.toLowerCase() },
        { enrollmentNumber: lookupId },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'No administrator account found with these credentials.' });
    }

    // Check role
    if (user.position !== 'Admin') {
      return res.status(403).json({
        message: `Access denied. This account is registered as a ${user.position}.`,
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid administrator credentials or password.' });
    }

    const token = generateToken(user);

    res.json({
      message: `Welcome, Administrator ${user.name}!`,
      token,
      user: formatUserProfile(user),
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login.' });
  }
});

/**
 * POST /api/auth/setup-admin
 * Initial secure one-time setup mechanism.
 * ONLY executes if NO Administrator currently exists in the database.
 * Body: { name, adminId, email, password }
 */
router.post('/setup-admin', async (req, res) => {
  try {
    // Check if an admin already exists
    const adminExists = await User.exists({ position: 'Admin' });
    if (adminExists) {
      return res.status(403).json({
        message: 'Admin setup is already completed. Please log in with existing administrator credentials.',
      });
    }

    const { name, adminId, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Admin name is required.' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanAdminId = (adminId || 'ADMIN01').trim();
    const cleanEmail = email ? email.trim().toLowerCase() : 'admin@library.edu';

    const admin = new User({
      name: name.trim(),
      adminId: cleanAdminId,
      email: cleanEmail,
      department: 'Library Administration',
      position: 'Admin',
      role: 'admin',
      password: password.trim(),
    });

    await admin.save();
    const token = generateToken(admin);

    res.status(201).json({
      message: 'Initial administrator account created successfully! You are now logged in.',
      token,
      user: formatUserProfile(admin),
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ message: 'Server error creating initial administrator.' });
  }
});

/**
 * GET /api/auth/status
 * Check if initial admin account exists (used by setup wizard UI).
 * Public endpoint.
 */
router.get('/status', async (req, res) => {
  try {
    const adminExists = await User.exists({ position: 'Admin' });
    res.json({
      initialized: !!adminExists,
      requiresAdminSetup: !adminExists,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ message: 'Server error checking auth status.' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile.
 * Protected route.
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: formatUserProfile(req.user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

module.exports = router;
