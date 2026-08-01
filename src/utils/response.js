/**
 * Standard success response shape per API Contract Specification:
 * { success: true, message, data }
 */
function sendSuccess(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Standard error response shape per API Contract Specification:
 * { success: false, message, error }
 * `error` is one of: UNAUTHORIZED | BAD_REQUEST | NOT_FOUND | INTERNAL_SERVER_ERROR
 */
function sendError(res, statusCode, message, errorCode = 'BAD_REQUEST') {
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
  });
}

export { sendSuccess, sendError };
