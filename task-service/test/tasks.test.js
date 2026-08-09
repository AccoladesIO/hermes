'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock the broker so route logic can be tested without RabbitMQ.
jest.mock('../src/messaging/publisher', () => ({
  publishTaskCreated: jest.fn().mockResolvedValue(undefined),
  isReady: () => true,
  init: jest.fn(),
  close: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const publisher = require('../src/messaging/publisher');
const { startMongo, stopMongo, clearMongo } = require('./mongo');

const app = createApp();
const token = jwt.sign({ sub: 'user-123', email: 'a@b.com' }, 'test-secret');
const auth = { Authorization: `Bearer ${token}` };

beforeAll(startMongo, 60_000);
afterAll(stopMongo);
afterEach(async () => {
  await clearMongo();
  jest.clearAllMocks();
});

describe('tasks', () => {
  test('requires auth', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x' });
    expect(res.status).toBe(401);
  });

  test('validates the payload', async () => {
    const res = await request(app).post('/tasks').set(auth).send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  test('creates a task, sets the owner from the token, and publishes an event', async () => {
    const res = await request(app)
      .post('/tasks')
      .set(auth)
      .send({ title: 'Write tests', description: 'jest + supertest' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('user-123');
    expect(res.body.status).toBe('todo');
    expect(publisher.publishTaskCreated).toHaveBeenCalledTimes(1);
    expect(publisher.publishTaskCreated.mock.calls[0][0]).toMatchObject({
      title: 'Write tests',
      userId: 'user-123',
    });
  });

  test('lists only the callers tasks, paginated and filterable', async () => {
    await request(app).post('/tasks').set(auth).send({ title: 'A' });
    await request(app).post('/tasks').set(auth).send({ title: 'B' });

    // A different user's task must not appear.
    const otherToken = jwt.sign({ sub: 'other', email: 'x@y.com' }, 'test-secret');
    await request(app)
      .post('/tasks')
      .set({ Authorization: `Bearer ${otherToken}` })
      .send({ title: 'C' });

    const res = await request(app).get('/tasks?page=1&limit=1').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
  });
});
