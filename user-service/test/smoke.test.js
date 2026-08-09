'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

// These paths never touch the database, so they validate the middleware
// wiring (helmet, request-id, validation, auth, error handling) in isolation.
describe('middleware wiring (no DB)', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  test('unknown route returns a structured 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('protected route without a token returns 401', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });

  test('invalid registration payload returns a 400 with details', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
