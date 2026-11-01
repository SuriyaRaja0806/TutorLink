const authService = require('./auth.service');
const ApiResponse = require('../../utils/apiResponse');
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require('../../utils/token.utils');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      setRefreshTokenCookie(res, result.refreshToken);
      return ApiResponse.created(res, {
        user: result.user,
        accessToken: result.accessToken
      }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      setRefreshTokenCookie(res, result.refreshToken);
      return ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const result = await authService.refresh(refreshToken);
      setRefreshTokenCookie(res, result.refreshToken);
      return ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken
      }, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user) {
        await authService.logout(req.user._id);
      }
      clearRefreshTokenCookie(res);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, { user: req.user }, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
