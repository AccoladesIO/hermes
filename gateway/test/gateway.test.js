'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const request = require('supertest');

// A fake upstream that echoes the path + forwarded request id.
function makeUpstream() {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        receivedPath: req.url,
        forwardedRequestId: req.headers['x-request-id'] || null,
      })
    );
  });
}

test('gateway routing', async (t) => {
  process.env.NODE_ENV = 'test';

  const upstream = makeUpstream();
  await new Promise((resolve) => upstream.listen(0, resolve));
  const url = `http://127.0.0.1:${upstream.address().port}`;
  process.env.USER_SERVICE_URL = url;
  process.env.TASK_SERVICE_URL = url;
  process.env.NOTIFICATION_SERVICE_URL = url;

  const createApp = require('../src/app');
  const app = createApp();

  t.after(() => new Promise((resolve) => upstream.close(resolve)));

  await t.test('health is served locally, not proxied', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.service, 'gateway');
  });

  await t.test('strips /api and forwards /api/users/me -> /users/me', async () => {
    const res = await request(app).get('/api/users/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.receivedPath, '/users/me');
  });

  await t.test('forwards /api/auth/login -> /auth/login (POST body)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.receivedPath, '/auth/login');
  });

  await t.test('forwards task + notification prefixes', async () => {
    const tasks = await request(app).get('/api/tasks');
    assert.strictEqual(tasks.body.receivedPath, '/tasks');
    const notifs = await request(app).get('/api/notifications');
    assert.strictEqual(notifs.body.receivedPath, '/notifications');
  });

  await t.test('propagates a correlation id downstream', async () => {
    const res = await request(app).get('/api/users/me').set('x-request-id', 'trace-abc');
    assert.strictEqual(res.body.forwardedRequestId, 'trace-abc');
  });

  await t.test('unknown paths return 404 from the gateway', async () => {
    const res = await request(app).get('/nope');
    assert.strictEqual(res.status, 404);
  });
});
