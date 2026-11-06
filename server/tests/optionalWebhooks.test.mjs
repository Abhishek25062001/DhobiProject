import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

test('production API starts without webhooks while preserving session protection', { timeout: 60000 }, async t => {
  // Exercise the real production entrypoint against a disposable database only.
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const directory = await mkdtemp(join(tmpdir(), 'indodhobi-startup-'));
  t.after(async () => { await database.stop(); await rm(directory, { recursive: true, force: true }); });

  for (const webhookValue of ['', undefined]) {
    await t.test(webhookValue === '' ? 'empty webhook secret' : 'absent webhook secret', async t => {
      const probe = createServer();
      probe.listen(0, '127.0.0.1');
      await once(probe, 'listening');
      const port = probe.address().port;
      await new Promise(resolve => probe.close(resolve));
      const env = {
        ...process.env, NODE_ENV: 'production', PORT: String(port),
        MONGO_URI: database.getUri(), JWT_SECRET: 'isolated-production-startup-secret-32-characters',
        RAZORPAY_KEY_ID: 'rzp_test_startup_fixture', RAZORPAY_KEY_SECRET: 'isolated-startup-api-secret',
        RAZORPAY_WEBHOOK_SECRET: webhookValue,
      };
      if (webhookValue === undefined) delete env.RAZORPAY_WEBHOOK_SECRET;
      // The empty working directory prevents machine-local .env credentials loading.
      const child = spawn(process.execPath, [fileURLToPath(new URL('../server.js', import.meta.url))], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      const exited = once(child, 'exit');
      t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await exited;
      });
      const origin = `http://127.0.0.1:${port}`;
      let health;
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        assert.equal(child.exitCode, null, `Production startup failed:\n${output}`);
        try {
          const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
          health = await response.json();
          if (response.ok && health.ready) break;
        } catch { /* The listener may not be ready yet. */ }
        await delay(50);
      }
      assert.equal(health?.ready, true, output);
      assert.equal(health.razorpayConfigured, true);
      const webhook = await fetch(`${origin}/api/orders/webhook/razorpay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'a'.repeat(64) },
        body: JSON.stringify({ event: 'payment.captured' }),
      });
      assert.equal(webhook.status, 404, 'Unused webhook route must be disabled');
      assert.equal((await webhook.json()).code, 'WEBHOOKS_DISABLED');
      const login = await fetch(`${origin}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Mode': 'cookie' }, body: '{}',
      });
      assert.equal(login.status, 403, 'Cookie login must still require CSRF protection');
    });
  }
});
