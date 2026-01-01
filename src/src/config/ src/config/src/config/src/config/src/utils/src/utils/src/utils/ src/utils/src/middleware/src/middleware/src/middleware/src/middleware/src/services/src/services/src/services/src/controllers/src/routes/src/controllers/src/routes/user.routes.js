// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', userController.getProfile);

/**
 * @swagger
 * /users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 */
router.put('/me', userController.updateProfile);

/**
 * @swagger
 * /users/me/preferences:
 *   put:
 *     tags: [Users]
 *     summary: Update user preferences
 *     security:
 *       - bearerAuth: []
 */
router.put('/me/preferences', userController.updatePreferences);

module.exports = router;
