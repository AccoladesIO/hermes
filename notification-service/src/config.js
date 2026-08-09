'use strict';

require('dotenv').config({ quiet: true });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  serviceName: 'notification-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3002),
  mongoUri: required('MONGO_URI', 'mongodb://mongo:27017/notifications'),
  amqpUrl: required('AMQP_URL', 'amqp://rabbitmq:5672'),
  jwt: {
    secret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  },
  queue: {
    exchange: process.env.TASK_EXCHANGE || 'tasks.exchange',
    routingKey: process.env.TASK_ROUTING_KEY || 'task.created',
    name: process.env.TASK_QUEUE || 'task_queue',
    deadLetterExchange: process.env.TASK_DLX || 'tasks.dlx',
    deadLetterQueue: process.env.TASK_DLQ || 'task_queue.dead',
    prefetch: Number(process.env.PREFETCH || 10),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
};

module.exports = config;
