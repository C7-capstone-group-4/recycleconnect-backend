/**
 * Operational error class. Thrown from controllers/services and caught
 * by the global error handler middleware, which maps it to the standard
 * error response shape.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - One of UNAUTHORIZED | BAD_REQUEST | NOT_FOUND | INTERNAL_SERVER_ERROR
   */
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
