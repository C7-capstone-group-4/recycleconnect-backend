import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';


// Protect Middleware: Verifies JWT token from Authorization header
export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. PLease log in to access this resource',
                error: 'UNAUTHORIZED',
            });
        }

        // Verify token validity
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'The user belonging to this token no longer exists.',
                error: 'UNAUTHORIZED',
            });
        }

        // Attach user object to Express request
        req.user = currentUser;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token. Please log in again.',
            error: 'UNAUTHORIZED',
        });
    }
};

/**
 * RestrictTo Middleware: Role-Based Access Control
 * @param {...String} allowedRoles - Array of permitted roles (e.g. 'ADMIN', 'HOUSEHOLD')
 */
export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.',
                error: 'FORBIDDEN',
            });
        }
        next();
    };
};
