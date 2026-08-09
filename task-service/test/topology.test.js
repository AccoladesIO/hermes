'use strict';

process.env.JWT_SECRET = 'test-secret';

const { assertTopology } = require('../src/messaging/publisher');

// A fake channel that records the AMQP topology calls.
function fakeChannel() {
  const calls = { exchanges: [], queues: [], binds: [] };
  return {
    calls,
    assertExchange: (name, type, opts) => {
      calls.exchanges.push({ name, type, opts });
      return Promise.resolve();
    },
    assertQueue: (name, opts) => {
      calls.queues.push({ name, opts });
      return Promise.resolve();
    },
    bindQueue: (queue, exchange, key) => {
      calls.binds.push({ queue, exchange, key });
      return Promise.resolve();
    },
  };
}

describe('AMQP topology', () => {
  test('declares a durable exchange, main queue with a DLX, and a dead-letter queue', async () => {
    const ch = fakeChannel();
    await assertTopology(ch);

    const mainExchange = ch.calls.exchanges.find((e) => e.name === 'tasks.exchange');
    const dlx = ch.calls.exchanges.find((e) => e.name === 'tasks.dlx');
    expect(mainExchange).toMatchObject({ type: 'direct', opts: { durable: true } });
    expect(dlx).toMatchObject({ type: 'fanout', opts: { durable: true } });

    const mainQueue = ch.calls.queues.find((q) => q.name === 'task_queue');
    expect(mainQueue.opts).toMatchObject({
      durable: true,
      deadLetterExchange: 'tasks.dlx',
    });

    const deadQueue = ch.calls.queues.find((q) => q.name === 'task_queue.dead');
    expect(deadQueue.opts).toMatchObject({ durable: true });

    // The main queue is bound to the exchange on the routing key.
    expect(ch.calls.binds).toEqual(
      expect.arrayContaining([
        { queue: 'task_queue', exchange: 'tasks.exchange', key: 'task.created' },
        { queue: 'task_queue.dead', exchange: 'tasks.dlx', key: '' },
      ])
    );
  });
});
