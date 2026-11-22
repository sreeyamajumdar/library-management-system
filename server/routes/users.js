const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/count
 * Return total number of users.
 * Admin only — non-admins cannot inspect total library members.
 */
router.get('/count', auth, authorize('admin'), async (req, res) => {
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
 * List all users. Supports search by name, department, enrollmentNumber, facultyId, or position.
 * Admin only.
 */
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { search, position } = req.query;
    let query = {};
    const conditions = [];

    if (position) {
      conditions.push({ position: new RegExp(`^${position}$`, 'i') });
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      conditions.push({
        $or: [
          { name: searchRegex },
          { department: searchRegex },
          { enrollmentNumber: searchRegex },
          { facultyId: searchRegex },
          { adminId: searchRegex },
          { email: searchRegex },
          { position: searchRegex },
        ],
      });
    }

    if (conditions.length > 0) {
      query = conditions.length === 1 ? conditions[0] : { $and: conditions };
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 });

    res.json({ count: users.length, users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

/**
 * POST /api/users/teacher
 * Admin-controlled creation of Teacher accounts.
 * Admin only.
 * Body: { name, facultyId, email, department, password }
 */
router.post('/teacher', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, facultyId, email, department, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Faculty member name is required.' });
    }
    if (!facultyId || !facultyId.trim()) {
      return res.status(400).json({ message: 'Faculty ID is required.' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ message: 'Academic department is required.' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanFacultyId = facultyId.trim();

    // Check if faculty ID or email already exists
    const existing = await User.findOne({
      $or: [
        { facultyId: cleanFacultyId },
        { enrollmentNumber: cleanFacultyId },
        ...(email ? [{ email: email.trim().toLowerCase() }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: 'An account with this Faculty ID or Email already exists.',
      });
    }

    const teacher = new User({
      name: name.trim(),
      facultyId: cleanFacultyId,
      email: email ? email.trim().toLowerCase() : undefined,
      department: department.trim(),
      position: 'Teacher',
      role: 'teacher',
      password: password.trim(),
    });

    await teacher.save();

    res.status(201).json({
      message: `Teacher account for "${teacher.name}" created successfully.`,
      user: {
        id: teacher._id,
        name: teacher.name,
        facultyId: teacher.facultyId,
        email: teacher.email,
        department: teacher.department,
        position: teacher.position,
        role: teacher.role,
        createdAt: teacher.createdAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Create teacher error:', error);
    res.status(500).json({ message: 'Server error creating teacher account.' });
  }
});

/**
 * POST /api/users/admin
 * Admin-controlled creation of additional Administrator accounts.
 * Admin only.
 * Body: { name, adminId, email, password }
 */
router.post('/admin', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, adminId, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Administrator name is required.' });
    }
    if (!adminId || !adminId.trim()) {
      return res.status(400).json({ message: 'Admin ID is required.' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanAdminId = adminId.trim();

    // Check if admin ID or email already exists
    const existing = await User.findOne({
      $or: [
        { adminId: cleanAdminId },
        ...(email ? [{ email: email.trim().toLowerCase() }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: 'An account with this Admin ID or Email already exists.',
      });
    }

    const admin = new User({
      name: name.trim(),
      adminId: cleanAdminId,
      email: email ? email.trim().toLowerCase() : undefined,
      department: 'Library Administration',
      position: 'Admin',
      role: 'admin',
      password: password.trim(),
    });

    await admin.save();

    res.status(201).json({
      message: `Administrator account for "${admin.name}" created successfully.`,
      user: {
        id: admin._id,
        name: admin.name,
        adminId: admin.adminId,
        email: admin.email,
        position: admin.position,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error creating admin account.' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user account.
 * Admin only. Cannot delete own account.
 */
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: `Account for "${user.name}" (${user.position}) removed successfully.` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

module.exports = router;
