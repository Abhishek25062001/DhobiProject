// Centralized Global Error Handling Middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  // Log error for server observability
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error Handler] ${req.method} ${req.url}:`, err);
  }

  // 1. Mongoose Bad ObjectId / CastError
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ${err.path}: ${err.value}`;
    return res.status(400).json({
      success: false,
      message
    });
  }

  // 2. Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `A record with this ${field} already exists. Please choose a different ${field}.`;
    return res.status(400).json({
      success: false,
      message
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    return res.status(400).json({
      success: false,
      message
    });
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid authentication token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Your login session has expired.'
    });
  }

  // 5. Default Fallback
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'The service could not complete this request. Please try again later.' : error.message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

export default errorHandler;
