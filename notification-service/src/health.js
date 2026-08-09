'use strict';

const express = require('express');
const db = require('./db');
const consumer = require('./messaging/consumer');
const config = require('./config');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: config.serviceName, uptime: process.uptime() });
});

router.get('/ready', (req, res) => {
  const mongo = db.isReady();
  const rabbit = consumer.isReady();
  const ready = mongo && rabbit;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    checks: { mongo: mongo ? 'up' : 'down', rabbitmq: rabbit ? 'up' : 'down' },
  });
});

module.exports = router;
