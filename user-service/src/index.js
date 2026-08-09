'use strict';

const createApp = require('./app');
const db = require('./db');
const config = require('./config');
const logger = require('./logger');

async function main() {
  await db.connect();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`${config.serviceName} listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down gracefully...');
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
}

main().catch((err) => {
  logger.error({ err: err.message }, 'Fatal startup error');
  process.exit(1);
});
