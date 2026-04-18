const { BadRequestError } = require('../utils/errors');

/**
 * Zod Validation Middleware
 * Usage: validate(myZodSchema)
 * Validates req.body against the Zod schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return next(new BadRequestError(messages.join('; ')));
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = { validate };
