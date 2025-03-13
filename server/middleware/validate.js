const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      const errors = result.error.errors.map(error => ({
        path: error.path.join('.'),
        message: error.message
      }));

      throw new AppError('Validation failed', 400, { errors });
    }

    // Add validated data to request
    req.validated = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate; 