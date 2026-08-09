'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('middleware wiring (no DB)', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('notification-service');
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  test('unknown route returns a structured 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });

  test('protected route without a token returns 401', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });
});
