'use strict';

const logger = require('../logger');

// 404 handler
function notFound(req, res) {
  res.status(404).json({ error: 'NotFound', message: `Cannot ${req.method} ${req.path}` });
}

// Centralized error handler (Express 5 forwards async rejections here).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error({ err: err.message, stack: err.stack, reqId: req.id }, 'Unhandled error');
  }
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: status >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
