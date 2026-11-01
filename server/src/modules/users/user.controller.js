const userService = require('./user.service');
const ApiResponse = require('../../utils/apiResponse');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const result = await userService.getAllUsers(req.query);
      return ApiResponse.success(
        res,
        result.users,
        'Users fetched successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return ApiResponse.success(res, user, 'User details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await userService.updateUser(req.user._id, req.body);
      return ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const updated = await userService.updateUserStatus(req.params.id, req.body.isActive);
      return ApiResponse.success(res, updated, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
