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
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./health');
const docsRoutes = require('./openapi');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(metricsMiddleware);

  app.use('/', healthRoutes);
  app.get('/metrics', metricsHandler);
  app.use('/', docsRoutes);

  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/notifications', notificationRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
