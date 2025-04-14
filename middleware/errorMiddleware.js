// backend/middleware/errorMiddleware.js

// This middleware handles 404 errors (resource not found)
const notFound = (req, res, next) => {
    // Creates a new error with a message that includes the requested URL
    const error = new Error(`Not found - ${req.originalUrl}`);
    // Sets the HTTP status to 404
    res.status(404);
    // Passes the error to the next middleware
    next(error);
  };
  
  // This centralized middleware handles all errors
  const errorHandler = (err, req, res, next) => {
    // Prints the error to the console (useful for debugging)
    console.error(err.stack);
    // If the status was 200, changes it to 500 (internal server error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    // Sets the response status
    res.status(statusCode);
    // Sends the response in JSON format
    res.json({
      message: err.message,
      // Shows the error stack only if NOT in production
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  };
  
  // Exports the functions to be used in other files
  module.exports = { notFound, errorHandler };
  