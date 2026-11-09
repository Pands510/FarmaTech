const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health deve retornar status UP 200', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'UP');
  assert.ok(body.timestamp);
});

test('GET /rota-inexistente deve retornar 404 formatado com code ROUTE_NOT_FOUND', async () => {
  const res = await fetch(`${baseUrl}/api/rota-inexistente`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.error, true);
  assert.equal(body.code, 'ROUTE_NOT_FOUND');
});

test('POST /api/auth/login sem payload deve retornar 400 com VALIDATION_ERROR', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, true);
  assert.equal(body.code, 'VALIDATION_ERROR');
});

test('GET /api/dashboard/kpis sem token deve ser bloqueado com 401 AUTH_TOKEN_MISSING', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard/kpis`);
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, true);
  assert.equal(body.code, 'AUTH_TOKEN_MISSING');
});
