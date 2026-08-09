'use strict';

const express = require('express');
const db = require('./db');
const config = require('./config');

const router = express.Router();

// Liveness: process is up.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: config.serviceName, uptime: process.uptime() });
});

// Readiness: dependencies are reachable.
router.get('/ready', (req, res) => {
  const ready = db.isReady();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    checks: { mongo: ready ? 'up' : 'down' },
  });
});

module.exports = router;
