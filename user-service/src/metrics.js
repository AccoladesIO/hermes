'use strict';

const client = require('prom-client');
const config = require('./config');

const registry = new client.Registry();
registry.setDefaultLabels({ service: config.serviceName });
client.collectDefaultMetrics({ register: registry });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// Express middleware that records request duration by route.
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

module.exports = { registry, metricsMiddleware, metricsHandler };
