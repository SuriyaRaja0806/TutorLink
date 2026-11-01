const User = require('./user.model');
const ApiError = require('../../utils/apiError');

class UserService {
  async getAllUsers({ page = 1, limit = 10, role, search } = {}) {
    const filter = {};
    if (role) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateUser(id, updateData) {
    // Prevent updating role, password, or email through this route
    delete updateData.role;
    delete updateData.password;
    delete updateData.email;
    delete updateData.tokenVersion;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateUserStatus(id, isActive) {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    ).select('-password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }
}

module.exports = new UserService();
