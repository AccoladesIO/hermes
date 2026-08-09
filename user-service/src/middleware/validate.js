'use strict';

// Returns middleware that validates req[source] against a zod schema.
// On success, replaces req[source] with the parsed (typed/defaulted) value.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
