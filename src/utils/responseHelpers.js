/**
 * Sends a response in the standard success envelope:
 * { success: true, message, data }
 * `data` is omitted from the payload if not provided.
 */
function successResponse(res, statusCode, message, data) {
  const payload = { success: true, message };
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
}

module.exports = { successResponse };
