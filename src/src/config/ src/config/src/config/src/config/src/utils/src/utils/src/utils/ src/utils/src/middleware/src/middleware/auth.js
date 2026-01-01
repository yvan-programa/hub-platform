// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const db = require('../config/database');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationError('Not authorized to access this route');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      
      // Check if user still exists
      const result = await db.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('User no longer exists');
      }

      req.user = result.rows[0];
      next();
    } catch (err) {
      throw new AuthenticationError('Invalid token');
    }
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Role ${req.user.role} is not authorized`));
    }

    next();
  };
};

module.exports = { protect, authorize };
