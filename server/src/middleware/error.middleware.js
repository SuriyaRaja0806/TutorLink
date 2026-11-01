const ApiError = require('../utils/apiError');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    error = new ApiError(400, 'Validation failed', formattedErrors);
  }
  // Handle Mongoose duplicate key error (code 11000)
  else if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyPattern || err.keyValue || {});
    let message = 'Duplicate key error';
    if (duplicateFields.includes('tutorId') && duplicateFields.includes('slotStart')) {
      message = 'This tutor already has a session booked for this time slot';
    } else if (duplicateFields.includes('email')) {
      message = 'A user with this email already exists';
    } else {
      message = `Duplicate value for field(s): ${duplicateFields.join(', ')}`;
    }
    error = new ApiError(409, message);
  }
  // Handle Mongoose CastError (e.g., invalid ObjectId)
  else if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }
  // Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    const formattedErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    error = new ApiError(400, 'Validation failed', formattedErrors);
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Authentication token has expired');
  }
  // Fallback for unknown errors
  else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message);
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'An unexpected error occurred'
  };

  if (error.errors && error.errors.length > 0) {
    response.errors = error.errors;
  }

  if (config.nodeEnv === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Cannot ${req.method} ${req.originalUrl}`));
};

module.exports = { errorHandler, notFoundHandler };
