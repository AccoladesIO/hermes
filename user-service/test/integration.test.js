'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const createApp = require('../src/app');
const { startMongo, stopMongo, clearMongo } = require('./mongo');

const app = createApp();

beforeAll(startMongo, 60_000);
afterAll(stopMongo);
afterEach(clearMongo);

const sample = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'supersecret1' };

describe('auth + users flow', () => {
  test('registers a user and returns a token, without leaking the password hash', async () => {
    const res = await request(app).post('/auth/register').send(sample);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('ada@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('rejects duplicate email registration with 409', async () => {
    await request(app).post('/auth/register').send(sample);
    const res = await request(app).post('/auth/register').send(sample);
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/auth/register').send(sample);

    const ok = await request(app)
      .post('/auth/login')
      .send({ email: sample.email, password: sample.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));

    const bad = await request(app)
      .post('/auth/login')
      .send({ email: sample.email, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
  });

  test('protects /users/me and returns the caller once authenticated', async () => {
    const reg = await request(app).post('/auth/register').send(sample);
    const { token } = reg.body;

    const noAuth = await request(app).get('/users/me');
    expect(noAuth.status).toBe(401);

    const me = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(sample.email);
  });

  test('paginates the user list', async () => {
    const reg = await request(app).post('/auth/register').send(sample);
    const { token } = reg.body;

    const res = await request(app)
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
