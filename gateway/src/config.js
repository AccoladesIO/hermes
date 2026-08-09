'use strict';

require('dotenv').config({ quiet: true });

const config = {
  serviceName: 'gateway',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  logLevel: process.env.LOG_LEVEL || 'info',
  services: {
    user: process.env.USER_SERVICE_URL || 'http://user-service:3000',
    task: process.env.TASK_SERVICE_URL || 'http://task-service:3001',
    notification:
      process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3002',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 600),
  },
};

module.exports = config;
