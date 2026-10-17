import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache, installRefreshEvents, REFRESH_INTERVAL_MS } from '../src/services/resourceCache.mjs';

test('T13 shared requests deduplicate, retain data during refresh and reject older responses', async () => {
  const cache = createResourceCache();
  let count = 0; const resolvers = [];
  const load = () => { count++; return new Promise(resolve => resolvers.push(resolve)); };
  const a = cache.subscribe('content:home', load, () => {});
  const b = cache.subscribe('content:home', load, () => {});
  await Promise.resolve(); assert.equal(count, 1);
  resolvers[0]({ revision: '1', page: 'Original' }); await cache.refresh('content:home');
  assert.equal(cache.snapshot('content:home').data.page, 'Original');
  const older = cache.refresh('content:home', true); await Promise.resolve();
  assert.equal(cache.snapshot('content:home').loading, false);
  assert.equal(cache.snapshot('content:home').refreshing, true);
  const newer = cache.refresh('content:home', true); await Promise.resolve();
  resolvers[2]({ revision: '3', page: 'Newer' }); await newer;
  resolvers[1]({ revision: '2', page: 'Older' }); await older;
  assert.equal(cache.snapshot('content:home').data.page, 'Newer');
  a(); b();
});
test('T13 failures preserve content, expose errors and recover without losing consumer state', async () => {
  const cache = createResourceCache(); let failure = false;
  cache.subscribe('bootstrap', async () => { if (failure) throw new Error('offline'); return { revision: '1', config: {} }; }, () => {});
  await cache.refresh('bootstrap'); const original = cache.snapshot('bootstrap').data;
  failure = true; await cache.refresh('bootstrap', true);
  assert.equal(cache.snapshot('bootstrap').data, original);
  assert.equal(cache.snapshot('bootstrap').error.message, 'offline');
  failure = false; await cache.refresh('bootstrap', true);
  assert.equal(cache.snapshot('bootstrap').error, null);
  assert.equal(cache.snapshot('bootstrap').data, original);
});
test('T13 visible tabs refresh every 30 seconds; focus, online and cross-tab signals invalidate', () => {
  const target = new EventTarget(); const document = new EventTarget(); document.visibilityState = 'visible';
  const channel = new EventTarget(); let periodic; const events = [];
  const cleanup = installRefreshEvents({ invalidate: options => events.push(['invalidate', options]), refreshActive: () => events.push(['refresh']) }, { target, document, channel, interval: (callback, ms) => { assert.equal(ms, REFRESH_INTERVAL_MS); periodic = callback; return 1; }, clear: () => events.push(['clear']) });
  periodic(); assert.equal(events.at(-1)[0], 'refresh');
  for (const event of ['focus', 'online', 'indodhobi:data-changed']) target.dispatchEvent(new Event(event));
  channel.dispatchEvent(new Event('message')); assert.equal(events.length, 5);
  document.visibilityState = 'hidden'; periodic(); assert.equal(events.length, 5);
  channel.dispatchEvent(new Event('message')); assert.deepEqual(events.at(-1), ['invalidate', { fetch: false }]);
  document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange')); assert.equal(events.length, 7);
  cleanup(); target.dispatchEvent(new Event('focus')); assert.equal(events.length, 8);
});
test('T13 unmounted private editor resources are discarded', async () => {
  const cache = createResourceCache(); const key = Symbol('private');
  const stop = cache.subscribe(key, async () => ({ private: true }), () => {});
  await cache.refresh(key); stop(); assert.equal(cache.snapshot(key).data, null);
});
