const User = require('../users/user.model');
const ApiError = require('../../utils/apiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../../utils/token.utils');

class AuthService {
  async register(data) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'student',
      yearOfStudy: data.yearOfStudy,
      department: data.department
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        yearOfStudy: user.yearOfStudy,
        department: user.department
      },
      accessToken,
      refreshToken
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        yearOfStudy: user.yearOfStudy,
        department: user.department
      },
      accessToken,
      refreshToken
    };
  }

  async refresh(token) {
    if (!token) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Check token version to prevent use of revoked refresh tokens
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    // Rotate refresh token on use for enhanced security
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId) {
    if (userId) {
      // Invalidate existing refresh tokens by incrementing tokenVersion
      await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
    }
    return true;
  }
}

module.exports = new AuthService();
