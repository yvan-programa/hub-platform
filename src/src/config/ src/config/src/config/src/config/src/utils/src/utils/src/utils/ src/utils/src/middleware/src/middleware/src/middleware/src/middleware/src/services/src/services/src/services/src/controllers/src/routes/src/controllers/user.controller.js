// src/controllers/user.controller.js
const userService = require('../services/user.service');
const { successResponse } = require('../utils/response');

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      successResponse(res, user, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      successResponse(res, user, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const user = await userService.updatePreferences(req.user.id, req.body);
      successResponse(res, user, 'Preferences updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
