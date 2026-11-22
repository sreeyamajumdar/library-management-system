const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * Extracts the token from the Authorization header (Bearer <token>),
 * verifies it, and attaches the user document to req.user.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Token is invalid.' });
    }

    // Attach user and normalized role
    req.user = user;
    req.user.role = (user.position || user.role || 'student').toLowerCase();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Usage: authorize('admin') or authorize('admin', 'teacher')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = (req.user.role || req.user.position || '').toLowerCase();
    const normalizedRoles = roles.map((r) => r.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Requires one of [${roles.join(', ')}] role. Your role is '${req.user.position}'.`,
      });
    }

    next();
  };
};

module.exports = auth;
module.exports.auth = auth;
module.exports.authorize = authorize;
