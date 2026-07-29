const { sendError } = require('../utils/response');

/**
 * Central error handler. Any error passed to next(err) — including thrown
 * AppErrors and errors caught by asyncHandler — ends up here.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known, operational errors (thrown deliberately via AppError)
  if (err.isOperational) {
    return sendError(res, err.statusCode, err.message, err.errorCode);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return sendError(
      res,
      409,
      `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`,
      'BAD_REQUEST'
    );
  }

  // Prisma "record not found" on update/delete
  if (err.code === 'P2025') {
    return sendError(res, 404, 'The requested resource was not found.', 'NOT_FOUND');
  }

  // Fallback: unexpected/programming error — log full detail server-side,
  // return a generic message to the client.
  console.error('UNEXPECTED ERROR 💥', err);
  return sendError(res, 500, 'Something went wrong. Please try again later.', 'INTERNAL_SERVER_ERROR');
}

module.exports = errorHandler;
