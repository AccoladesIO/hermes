'use strict';

const amqp = require('amqplib');
const config = require('../config');
const logger = require('../logger');

let connection = null;
let channel = null; // a ConfirmChannel
let connecting = null;

const { exchange, routingKey, name, deadLetterExchange, deadLetterQueue } = config.queue;

// Declare the full durable topology:
//   tasks.exchange (direct) --routingKey--> task_queue
//   task_queue dead-letters to tasks.dlx (fanout) --> task_queue.dead
async function assertTopology(ch) {
  await ch.assertExchange(exchange, 'direct', { durable: true });
  await ch.assertExchange(deadLetterExchange, 'fanout', { durable: true });

  await ch.assertQueue(deadLetterQueue, { durable: true });
  await ch.bindQueue(deadLetterQueue, deadLetterExchange, '');

  await ch.assertQueue(name, {
    durable: true,
    deadLetterExchange,
  });
  await ch.bindQueue(name, exchange, routingKey);
}

async function connect() {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    connection = await amqp.connect(config.amqpUrl);
    connection.on('error', (err) => logger.error({ err: err.message }, 'AMQP connection error'));
    connection.on('close', () => {
      logger.warn('AMQP connection closed; will reconnect on next publish');
      connection = null;
      channel = null;
    });

    channel = await connection.createConfirmChannel();
    await assertTopology(channel);
    logger.info('AMQP publisher connected and topology asserted');
    connecting = null;
    return channel;
  })().catch((err) => {
    connecting = null;
    channel = null;
    connection = null;
    throw err;
  });

  return connecting;
}

// Connect with retries at startup so a slow broker doesn't crash the service.
async function init({ retries = 10, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await connect();
    } catch (err) {
      logger.warn({ err: err.message, attempt, retries }, 'AMQP connect failed, retrying...');
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

// Publish a task event; resolves only after the broker confirms the message.
function publishTaskCreated(payload, { requestId } = {}) {
  return new Promise((resolve, reject) => {
    connect()
      .then((ch) => {
        const body = Buffer.from(JSON.stringify(payload));
        ch.publish(
          exchange,
          routingKey,
          body,
          {
            persistent: true,
            contentType: 'application/json',
            messageId: String(payload.taskId),
            timestamp: Date.now(),
            headers: requestId ? { 'x-request-id': requestId } : {},
          },
          (err) => (err ? reject(err) : resolve())
        );
      })
      .catch(reject);
  });
}

function isReady() {
  return Boolean(channel);
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    /* already closing */
  }
  channel = null;
  connection = null;
}

module.exports = { init, publishTaskCreated, isReady, close, assertTopology };
