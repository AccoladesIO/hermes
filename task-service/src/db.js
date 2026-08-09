'use strict';

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

mongoose.set('strictQuery', true);

async function connect({ retries = 10, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      logger.info('MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      logger.warn(
        { err: err.message, attempt, retries },
        'MongoDB connection failed, retrying...'
      );
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return mongoose.connection;
}

function isReady() {
  // 1 === connected
  return mongoose.connection.readyState === 1;
}

async function disconnect() {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
}

module.exports = { connect, disconnect, isReady, mongoose };
