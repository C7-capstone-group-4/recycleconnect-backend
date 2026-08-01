import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/db.js';

/**
 * protect: Verifies the JWT on incoming requests and attaches the
 * authenticated user (id, role) to req.user.
 * Expects: Authorization: Bearer <token>
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('You are not logged in. Please log in to access this resource.', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired token. Please log in again.', 401, 'UNAUTHORIZED');
  }

  // Confirm the user still exists (handles deleted/deactivated accounts)
  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.user_id },
    select: { id: true, role: true, email: true },
  });

  if (!currentUser) {
    throw new AppError('The user belonging to this token no longer exists.', 401, 'UNAUTHORIZED');
  }

  req.user = { id: currentUser.id, role: currentUser.role, email: currentUser.email };
  next();
});

/**
 * restrictTo: Restricts access to the given roles.
 * Usage: restrictTo('COLLECTION_PARTNER', 'ADMIN')
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new AppError('You do not have permission to perform this action.', 403, 'UNAUTHORIZED');
  }
  next();
};

export { protect, restrictTo };
export default  { protect, restrictTo };
