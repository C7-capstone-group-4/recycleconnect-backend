function successResponse(res, statusCode, message, data) {
  const payload = { success: true, message };
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
}

export { successResponse };
