// src/services/auth.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const redis = require('../config/redis');
const config = require('../config');
const { AuthenticationError, ValidationError, ConflictError } = require('../utils/errors');
const { validateEmail, validatePassword } = require('../utils/validators');
const logger = require('../utils/logger');

class AuthService {
  async register(email, password, phone, fullName) {
    // Validate input
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!validatePassword(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters with uppercase, lowercase, and number'
      );
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, phone, full_name, role, preferences)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, phone, full_name, role, created_at`,
      [email.toLowerCase(), passwordHash, phone, fullName, 'user', {}]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    logger.info(`New user registered: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(email, password) {
    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Check if refresh token is blacklisted
      const blacklisted = await redis.cache.get(`blacklist:${refreshToken}`);
      if (blacklisted) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.id);

      // Blacklist old refresh token
      await redis.cache.set(
        `blacklist:${refreshToken}`,
        true,
        7 * 24 * 60 * 60 // 7 days
      );

      return tokens;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  async logout(userId, refreshToken) {
    // Blacklist refresh token
    if (refreshToken) {
      await redis.cache.set(
        `blacklist:${refreshToken}`,
        true,
        7 * 24 * 60 * 60
      );
    }

    logger.info(`User logged out: ${userId}`);
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!validatePassword(newPassword)) {
      throw new ValidationError(
        'Password must be at least 8 characters with uppercase, lowercase, and number'
      );
    }

    // Get user
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    logger.info(`Password changed for user: ${userId}`);
  }

  async requestPasswordReset(email) {
    const result = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return;
    }

    const userId = result.rows[0].id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store in Redis with 1 hour expiry
    await redis.cache.set(
      `password-reset:${resetTokenHash}`,
      userId,
      3600
    );

    // TODO: Send email with reset link
    logger.info(`Password reset requested for: ${email}`);

    return resetToken;
  }

  async resetPassword(token, newPassword) {
    if (!validatePassword(newPassword)) {
      throw new ValidationError(
        'Password must be at least 8 characters with uppercase, lowercase, and number'
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Get user ID from Redis
    const userId = await redis.cache.get(`password-reset:${tokenHash}`);

    if (!userId) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // Delete reset token
    await redis.cache.del(`password-reset:${tokenHash}`);

    logger.info(`Password reset for user: ${userId}`);
  }

  async generateTokens(userId) {
    const accessToken = jwt.sign(
      { id: userId, type: 'access' },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: userId, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  sanitizeUser(user) {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new AuthService();
