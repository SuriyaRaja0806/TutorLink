const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  getUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema
} = require('./user.validation');

// Update current user profile
router.patch(
  '/profile',
  authenticate,
  validate(updateUserSchema),
  userController.updateProfile
);

// Admin only: list all users
router.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(getUsersQuerySchema),
  userController.getAllUsers
);

// Get specific user by ID
router.get(
  '/:id',
  authenticate,
  userController.getUserById
);

// Admin only: activate or deactivate a user
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(updateUserStatusSchema),
  userController.updateUserStatus
);

module.exports = router;
