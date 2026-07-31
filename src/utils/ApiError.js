class ApiError extends Error {
  constructor(statusCode, message, errorCode = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export default ApiError;
