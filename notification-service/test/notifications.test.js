'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const consumer = require('../src/messaging/consumer');
const Notification = require('../src/models/notification');
const { startMongo, stopMongo, clearMongo } = require('./mongo');

const app = createApp();
const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, 'test-secret');
const auth = { Authorization: `Bearer ${token}` };

beforeAll(startMongo, 60_000);
afterAll(stopMongo);
afterEach(clearMongo);

describe('consumer.processMessage', () => {
  test('persists a notification from a valid task event', async () => {
    const event = JSON.stringify({
      taskId: 'task-1',
      userId: 'user-123',
      title: 'Ship it',
      description: 'now',
    });
    const notification = await consumer.processMessage(event);
    expect(notification.userId).toBe('user-123');
    expect(notification.message).toContain('Ship it');

    const count = await Notification.countDocuments();
    expect(count).toBe(1);
  });

  test('throws on malformed JSON (poison message)', async () => {
    await expect(consumer.processMessage('{not json')).rejects.toThrow();
    expect(await Notification.countDocuments()).toBe(0);
  });

  test('throws on a valid-JSON but invalid-shape message', async () => {
    await expect(consumer.processMessage(JSON.stringify({ foo: 'bar' }))).rejects.toThrow();
    expect(await Notification.countDocuments()).toBe(0);
  });
});

describe('GET /notifications', () => {
  test('requires auth', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });

  test('returns only the callers notifications', async () => {
    await consumer.processMessage(
      JSON.stringify({ taskId: 't1', userId: 'user-123', title: 'Mine' })
    );
    await consumer.processMessage(
      JSON.stringify({ taskId: 't2', userId: 'someone-else', title: 'Theirs' })
    );

    const res = await request(app).get('/notifications').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].message).toContain('Mine');
  });

  test('marks a notification as read', async () => {
    const n = await consumer.processMessage(
      JSON.stringify({ taskId: 't1', userId: 'user-123', title: 'Mine' })
    );
    const res = await request(app).patch(`/notifications/${n.id}/read`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
  });
});
