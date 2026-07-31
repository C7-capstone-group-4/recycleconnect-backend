/**
 * Custom error class carrying an HTTP status code and a machine-readable
 * error code, matching the API contract's standard error envelope:
 * { success: false, message, error }
 */
class ApiError extends Error {
  constructor(statusCode, message, errorCode = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

module.exports = ApiError;
