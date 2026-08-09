'use strict';

const createApp = require('./app');
const config = require('./config');
const logger = require('./logger');

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(`${config.serviceName} listening on port ${config.port}`);
  logger.info({ routes: config.services }, 'Proxy routes');
});

function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
