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
  serviceName: 'user-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  mongoUri: required('MONGO_URI', 'mongodb://mongo:27017/users'),
  jwt: {
    secret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
};

module.exports = config;
