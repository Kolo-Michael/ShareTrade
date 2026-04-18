const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');
const prisma = require('../config/db');

/**
 * JWT Authentication Middleware
 * Extracts token from Authorization header, verifies it,
 * and attaches the full user object to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        kycStatus: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive || user.isSuspended) {
      throw new UnauthorizedError('Account is suspended or deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
}

module.exports = { authenticate };
