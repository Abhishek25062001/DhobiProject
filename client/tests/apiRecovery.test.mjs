import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import axios from 'axios';
import { readWithRetry, requireCatalog, requirePublicConfig } from '../src/services/readWithRetry.js';

async function fixture(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return axios.create({ baseURL: `http://127.0.0.1:${server.address().port}` });
}

test('catalog reads recover after two temporary backend failures', async t => {
  let calls = 0;
  const client = await fixture(t, (req, res) => {
    assert.equal(req.method, 'GET');
    calls += 1;
    res.writeHead(calls < 3 ? 503 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: calls >= 3, data: [] }));
  });
  const response = await readWithRetry(client, '/catalog/garments', {}, [1, 1]);
  assert.equal(requireCatalog(response.data).success, true);
  assert.equal(calls, 3);
});

test('an extended outage ends after the bounded attempts', async t => {
  let calls = 0;
  const client = await fixture(t, (_req, res) => { calls += 1; res.writeHead(503); res.end(); });
  await assert.rejects(readWithRetry(client, '/config/public', {}, [1, 1]));
  assert.equal(calls, 3);
});

test('validation and authorization errors are not retried', async t => {
  for (const status of [400, 401, 403, 404, 422, 429]) {
    let calls = 0;
    const client = await fixture(t, (_req, res) => { calls += 1; res.writeHead(status); res.end(); });
    await assert.rejects(readWithRetry(client, '/catalog/garments', {}, [1, 1]));
    assert.equal(calls, 1);
  }
});

test('abandoning a page cancels a pending retry', async t => {
  const controller = new AbortController();
  let calls = 0;
  const client = await fixture(t, (_req, res) => {
    calls += 1;
    res.writeHead(503); res.end();
    setTimeout(() => controller.abort(), 5);
  });
  await assert.rejects(readWithRetry(client, '/config/public', { signal: controller.signal }, [100, 100]));
  assert.equal(calls, 1);
});

test('a hung request times out rather than leaving the page loading indefinitely', async t => {
  const client = await fixture(t, () => {});
  await assert.rejects(readWithRetry(client, '/catalog/garments', { timeout: 15 }, []), error => error.code === 'ECONNABORTED');
});

test('missing or malformed data is rejected, and a genuine empty catalog is allowed', () => {
  for (const data of [{}, { success: true }, { success: false, data: [] }, { success: true, data: [{ name: 'Shirt' }] }]) {
    assert.throws(() => requireCatalog(data), /catalog could not/);
  }
  assert.deepEqual(requireCatalog({ success: true, data: [] }).data, []);
  assert.throws(() => requirePublicConfig({ success: true, config: {}, slots: [] }), /information could not/);
});

test('zero tax and fees are valid configured values, not replaced by defaults', () => {
  const payload = { success: true, slots: [], config: {
    gstPercentage: 0, deliveryFee: 0, freeDeliveryThreshold: 0, expressSurcharge: 0, minStandardTurnaroundHours: 0,
    detergentOptions: [], packagingOptions: [], serviceTypes: [], ironingTiers: [],
  } };
  assert.equal(requirePublicConfig(payload), payload);
  assert.throws(() => requirePublicConfig({ ...payload, config: { ...payload.config, gstPercentage: '5' } }));
});
