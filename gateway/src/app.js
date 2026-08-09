'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { randomUUID } = require('node:crypto');

const logger = require('./logger');
const config = require('./config');
const { metricsMiddleware, metricsHandler } = require('./metrics');

// Build a proxy for one upstream service. Requests matching any of `prefixes`
// are forwarded with the leading `/api` stripped (so `/api/users/me` becomes
// `/users/me` upstream). No body parser runs here — the raw body is streamed
// straight through, and each service parses it itself.
function makeProxy(prefixes, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    pathFilter: prefixes,
    pathRewrite: { '^/api': '' },
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.id) proxyReq.setHeader('x-request-id', req.id);
      },
      error: (err, req, res) => {
        logger.error({ err: err.message, target }, 'Upstream proxy error');
        if (res && !res.headersSent && res.writeHead) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({ error: 'BadGateway', message: 'Upstream service unavailable' })
          );
        }
      },
    },
  });
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());

  // Correlation id, generated here and propagated to every downstream service.
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(metricsMiddleware);

  // Gateway's own liveness + metrics (never proxied).
  app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: config.serviceName, uptime: process.uptime() })
  );
  app.get('/metrics', metricsHandler);

  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Route table: prefix -> upstream service.
  app.use(makeProxy(['/api/auth', '/api/users'], config.services.user));
  app.use(makeProxy(['/api/tasks'], config.services.task));
  app.use(makeProxy(['/api/notifications'], config.services.notification));

  app.use((req, res) =>
    res.status(404).json({ error: 'NotFound', message: `No route for ${req.path}` })
  );

  return app;
}

module.exports = createApp;
