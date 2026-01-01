// src/controllers/auth.controller.js
const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response');
const db = require('../config/database');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, phone, fullName } = req.body;
      const result = await authService.register(email, password, phone, fullName);
      successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      successResponse(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.id, refreshToken);
      successResponse(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      successResponse(res, null, 'Password reset email sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      successResponse(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const result = await db.query(
        'SELECT id, email, phone, full_name, role, preferences, last_login, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
      successResponse(res, result.rows[0], 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
