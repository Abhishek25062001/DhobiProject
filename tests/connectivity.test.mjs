import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiPort, developmentApiTarget, waitForApi } from '../shared/runtime.mjs';
import { startHttpService } from '../server/utils/startHttpService.js';
import express from '../server/node_modules/express/index.js';

async function fixture(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { port: server.address().port, origin: `http://127.0.0.1:${server.address().port}` };
}

test('default and custom development ports agree; invalid or mismatched configuration fails clearly', () => {
  assert.equal(apiPort(), 5001);
  assert.equal(developmentApiTarget(undefined), 'http://localhost:5001');
  assert.equal(developmentApiTarget('5010', 'http://127.0.0.1:5010/'), 'http://127.0.0.1:5010');
  assert.throws(() => developmentApiTarget(5000, 'http://localhost:5001'), /port mismatch/);
  for (const port of ['', 'not-a-port', 0, -1, 65536, 5.5]) assert.throws(() => apiPort(port), /PORT must/);
  for (const url of ['file:///tmp/api', 'http://user:password@localhost:5001', 'http://localhost:5001/api']) {
    assert.throws(() => developmentApiTarget(5001, url), /HTTP\(S\) origin/);
  }
});

test('frontend waits through startup responses until both API and database are ready', async t => {
  let calls = 0;
  const { origin } = await fixture(t, (_req, res) => {
    calls += 1;
    const ready = calls >= 3;
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'IndoDhobi API', status: ready ? 'ok' : 'unavailable', dbState: ready ? 'CONNECTED' : 'DISCONNECTED', ready }));
  });
  await waitForApi(origin, { timeoutMs: 1000, intervalMs: 5 });
  assert.equal(calls, 3);
});

test('a disconnected database or unrelated HTTP service cannot pass readiness', async t => {
  for (const health of [
    { service: 'IndoDhobi API', status: 'ok', dbState: 'DISCONNECTED' },
    { service: 'Another app', status: 'ok', dbState: 'CONNECTED' },
    { service: 'IndoDhobi API', status: 'ok', dbState: 'CONNECTED', ready: false },
  ]) {
    const { origin } = await fixture(t, (_req, res) => res.end(JSON.stringify(health)));
    await assert.rejects(waitForApi(origin, { timeoutMs: 40, intervalMs: 5 }), /API is not ready/);
  }
});

test('an occupied API port fails before initialization and never switches ports', async t => {
  const { port } = await fixture(t, (_req, res) => res.end('occupied'));
  let initialized = false;
  await assert.rejects(startHttpService(express(), {
    port,
    initialize: async () => { initialized = true; },
  }), error => error.code === 'EADDRINUSE' && /will not switch ports/.test(error.message));
  assert.equal(initialized, false);
});

test('initialization is marked unavailable, and a failure closes the listener and runs cleanup', async () => {
  const app = express();
  let listener;
  let cleaned = false;
  const listen = app.listen.bind(app);
  app.listen = (...args) => (listener = listen(...args));
  await assert.rejects(startHttpService(app, {
    port: 0,
    initialize: async () => {
      assert.equal(app.locals.initializing, true);
      throw new Error('Database unavailable');
    },
    cleanup: async () => { cleaned = true; },
  }), /Database unavailable/);
  assert.equal(listener.listening, false);
  assert.equal(cleaned, true);
});

test('successful initialization clears the startup gate on the same listener', async t => {
  const app = express();
  const server = await startHttpService(app, { port: 0, initialize: async () => {} });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(app.locals.initializing, false);
  assert.equal(server.listening, true);
});

test('real API returns 503 immediately for health, catalog and configuration without a DB connection', async t => {
  process.env.NODE_ENV = 'test';
  const { app } = await import('../server/server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/api/health', '/api/catalog/garments', '/api/config/public']) {
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(1000) });
    assert.equal(response.status, 503);
    const body = await response.json();
    if (path.endsWith('/health')) {
      assert.equal(body.ready, false);
      assert.equal(body.dbState, 'DISCONNECTED');
    } else assert.equal(body.code, 'API_UNAVAILABLE');
  }
});
