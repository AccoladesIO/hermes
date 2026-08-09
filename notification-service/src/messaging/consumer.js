'use strict';

const amqp = require('amqplib');
const { z } = require('zod');
const config = require('../config');
const logger = require('../logger');
const Notification = require('../models/notification');

let connection = null;
let channel = null;
let started = false;

const {
  exchange,
  routingKey,
  name,
  deadLetterExchange,
  deadLetterQueue,
  prefetch,
} = config.queue;

// The event shape we accept. Anything else is a poison message.
const taskEventSchema = z.object({
  taskId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(''),
});

// Declare the same durable topology the publisher uses, so this service can
// start before task-service without the queue being missing.
async function assertTopology(ch) {
  await ch.assertExchange(exchange, 'direct', { durable: true });
  await ch.assertExchange(deadLetterExchange, 'fanout', { durable: true });
  await ch.assertQueue(deadLetterQueue, { durable: true });
  await ch.bindQueue(deadLetterQueue, deadLetterExchange, '');
  await ch.assertQueue(name, { durable: true, deadLetterExchange });
  await ch.bindQueue(name, exchange, routingKey);
}

// Pure handler: validate + persist a notification from a raw message body.
// Returns the created notification, or throws on an invalid payload.
async function processMessage(rawContent) {
  const parsed = taskEventSchema.parse(JSON.parse(rawContent));
  const notification = await Notification.create({
    userId: parsed.userId,
    taskId: parsed.taskId,
    type: 'task.created',
    message: `New task created: ${parsed.title}`,
  });
  return notification;
}

async function onMessage(msg) {
  if (!msg) return;
  try {
    const notification = await processMessage(msg.content.toString());
    channel.ack(msg);
    logger.info(
      { notificationId: notification.id, userId: notification.userId },
      'Notification stored'
    );
  } catch (err) {
    // Poison message (bad JSON / invalid shape): do NOT requeue — dead-letter it.
    logger.error({ err: err.message }, 'Rejecting poison message to dead-letter queue');
    channel.nack(msg, false, false);
  }
}

async function connectAndConsume() {
  connection = await amqp.connect(config.amqpUrl);

  connection.on('error', (err) => logger.error({ err: err.message }, 'AMQP connection error'));
  connection.on('close', () => {
    logger.warn('AMQP connection closed; scheduling reconnect');
    connection = null;
    channel = null;
    if (started) scheduleReconnect();
  });

  channel = await connection.createChannel();
  await assertTopology(channel);
  await channel.prefetch(prefetch);
  await channel.consume(name, onMessage, { noAck: false });
  logger.info('Notification consumer connected and listening');
}

let reconnectTimer = null;
function scheduleReconnect(delayMs = 3000) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectAndConsume();
    } catch (err) {
      logger.warn({ err: err.message }, 'Reconnect failed; retrying');
      scheduleReconnect(Math.min(delayMs * 2, 30_000));
    }
  }, delayMs);
  reconnectTimer.unref?.();
}

// Start with retries so a slow broker at boot doesn't crash the service.
async function start({ retries = 10, delayMs = 3000 } = {}) {
  started = true;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await connectAndConsume();
      return;
    } catch (err) {
      logger.warn({ err: err.message, attempt, retries }, 'Consumer connect failed, retrying...');
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function isReady() {
  return Boolean(channel);
}

async function close() {
  started = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    /* already closing */
  }
  channel = null;
  connection = null;
}

module.exports = { start, close, isReady, processMessage, assertTopology };
