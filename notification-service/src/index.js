'use strict';

const createApp = require('./app');
const db = require('./db');
const consumer = require('./messaging/consumer');
const config = require('./config');
const logger = require('./logger');

async function main() {
  await db.connect();
  await consumer.start();

  // The notification service now also runs a real HTTP server so it can be
  // health-checked, expose metrics, and serve the notifications API.
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`${config.serviceName} listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down gracefully...');
    server.close(async () => {
      await consumer.close();
      await db.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
}

main().catch((err) => {
  logger.error({ err: err.message }, 'Fatal startup error');
  process.exit(1);
});
