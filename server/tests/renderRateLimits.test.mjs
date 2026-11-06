import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTestHarness } from './contentTestHarness.mjs';

test('public Render requests are limited by the visitor IP for API and login routes', async t => {
  process.env.RENDER = 'true';
  process.env.RENDER_SERVICE_TYPE = 'web';
  const { request } = await contentTestHarness(t);
  // Enable the real rate limiters after connecting to the disposable test database.
  process.env.NODE_ENV = 'production';

  async function remaining(path, clientIp, forwardedFor) {
    const headers = { 'X-Forwarded-For': forwardedFor };
    if (clientIp) headers['CF-Connecting-IP'] = clientIp;
    const options = path === '/health' ? { headers } : { headers, method: 'POST', body: {} };
    const response = await request(path, options);
    assert.equal(response.status, path === '/health' ? 200 : 400);
    return response.headers.get('ratelimit-remaining');
  }

  for (const [path, limit] of [['/health', 1000], ['/auth/customer/firebase-login', 100]]) {
    await t.test(path, async () => {
      const a = '198.51.100.17', b = '198.51.100.18';
      assert.equal(await remaining(path, a, a), String(limit - 1));
      assert.equal(await remaining(path, a, '192.0.2.9, ' + a), String(limit - 2));
      assert.equal(await remaining(path, b, b), String(limit - 1));
    });
  }

  await t.test('unusable edge headers fall back to the connection address', async () => {
    assert.equal(await remaining('/health', null, '192.0.2.20'), '999');
    assert.equal(await remaining('/health', '192.0.2.1, 192.0.2.2', '192.0.2.21'), '998');
  });
  await t.test('requests through the Vercel /api rewrite are limited per forwarded visitor', async () => {
    async function proxied(path, visitor) {
      const headers = { 'CF-Connecting-IP': '203.0.113.50', 'X-Forwarded-For': `${visitor}, 203.0.113.50`, 'x-vercel-id': 'bom1::test' };
      const options = path === '/health' ? { headers } : { headers, method: 'POST', body: {} };
      return (await request(path, options)).headers.get('ratelimit-remaining');
    }
    assert.equal(await proxied('/auth/login', '198.51.100.40'), '99');
    assert.equal(await proxied('/auth/login', '198.51.100.40'), '98');
    // Another visitor behind the same Vercel egress address keeps a separate limit.
    assert.equal(await proxied('/auth/login', '198.51.100.41'), '99');
    // An unusable forwarded address falls back to the connection address.
    assert.equal(await proxied('/health', 'not-an-ip'), '999');
  });
  await t.test('IPv6 addresses in the same visitor subnet share a limit', async () => {
    assert.equal(await remaining('/health', '2001:db8:1::1', '192.0.2.1'), '999');
    assert.equal(await remaining('/health', '2001:db8:1::2', '192.0.2.2'), '998');
  });
});
