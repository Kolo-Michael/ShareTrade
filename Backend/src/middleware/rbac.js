const { ForbiddenError } = require('../utils/errors');

/**
 * Role-Based Access Control Middleware
 * Usage: requireRole('ADMIN') or requireRole('INVESTOR', 'ADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`));
    }

    next();
  };
}

module.exports = { requireRole };
