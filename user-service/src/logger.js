'use strict';

const pino = require('pino');
const config = require('./config');

const logger = pino({
  name: config.serviceName,
  level: config.logLevel,
  // Pretty output in dev; JSON in production for log aggregators.
  transport:
    config.env === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  redact: ['req.headers.authorization', 'password', '*.password'],
});

module.exports = logger;
