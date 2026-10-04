module.exports = function validate(schema, { unknown = 'reject' } = {}) {
  return function (req, res, next) {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: unknown === 'strip'
    });

    if (error) {
      return res.status(422).json({
        message: 'Invalid request data',
        errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    req.body = value;
    return next();
  };
};