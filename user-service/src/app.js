'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { randomUUID } = require('node:crypto');

const logger = require('./logger');
const config = require('./config');
const { metricsMiddleware, metricsHandler } = require('./metrics');
const { notFound, errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthRoutes = require('./health');
const docsRoutes = require('./openapi');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Correlation ID: reuse an inbound one (from the gateway) or mint a new one.
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(metricsMiddleware);

  // Observability endpoints (no rate limit, no auth).
  app.use('/', healthRoutes);
  app.get('/metrics', metricsHandler);
  app.use('/', docsRoutes);

  // Rate limiting for the API surface.
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
