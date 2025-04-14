/**
 * Centralized Error Handler Middleware
 * 
 * This middleware provides consistent error handling across the application.
 * It categorizes errors and formats responses appropriately.
 */

// Define error types
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  PAYMENT: 'PAYMENT_ERROR',
  SERVER: 'SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * Custom error class with type and status code
 */
class AppError extends Error {
  constructor(message, type, statusCode, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Map error types to appropriate HTTP status codes
 */
const getStatusCode = (type) => {
  switch (type) {
    case ErrorTypes.VALIDATION:
      return 400;
    case ErrorTypes.AUTHENTICATION:
      return 401;
    case ErrorTypes.AUTHORIZATION:
      return 403;
    case ErrorTypes.RESOURCE_NOT_FOUND:
      return 404;
    case ErrorTypes.DUPLICATE_RESOURCE:
      return 409;
    case ErrorTypes.PAYMENT:
      return 402;
    case ErrorTypes.BAD_REQUEST:
      return 400;
    case ErrorTypes.DATABASE:
    case ErrorTypes.SERVER:
    case ErrorTypes.EXTERNAL_SERVICE:
    default:
      return 500;
  }
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('❌ Error caught by handler:', err);
  
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default to server error
  let statusCode = err.statusCode || 500;
  let errorType = err.type || ErrorTypes.SERVER;
  let message = err.message || 'Internal server error';
  
  // Handle known error cases
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    errorType = ErrorTypes.VALIDATION;
    message = 'Validation error';
  } else if (err.name === 'MongoError' && err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    errorType = ErrorTypes.DUPLICATE_RESOURCE;
    message = 'Duplicate resource';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    // JWT errors
    statusCode = 401;
    errorType = ErrorTypes.AUTHENTICATION;
    message = 'Invalid or expired token';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    // External service connection errors
    statusCode = 503;
    errorType = ErrorTypes.EXTERNAL_SERVICE;
    message = 'Service unavailable';
  }
  
  // Format the response
  const errorResponse = {
    success: false,
    error: {
      type: errorType,
      message: message,
      // Only include details in development mode or if specifically allowed
      ...(isDevelopment && { details: err.details || err.stack }),
    }
  };
  
  // Send formatted response
  res.status(statusCode).json(errorResponse);
};

/**
 * Not found (404) middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Resource not found - ${req.originalUrl}`,
    ErrorTypes.RESOURCE_NOT_FOUND,
    404
  );
  next(error);
};

/**
 * Async handler to catch errors in async routes
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ErrorTypes
}; 