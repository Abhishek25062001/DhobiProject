import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKING_STAGES, getTrackingState, selectTrackedOrder } from '../src/utils/orderTracking.mjs';
import { ORDER_POLL_INTERVAL_MS, ORDER_CHANGED_EVENT, startActiveOrderFeed, notifyOrdersChanged } from '../src/services/activeOrderFeed.mjs';

const order = (id = 'one', orderStatus = 'BOOKED') => ({ _id: id, orderStatus });
const payload = (...orders) => ({ success: true, activeOrders: orders });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture(t, load) {
  const target = new EventTarget();
  const document = new EventTarget(); document.visibilityState = 'visible';
  let online = true, tick, cleared = false;
  const states = [];
  const feed = startActiveOrderFeed({
    load, target, document, isOnline: () => online, now: () => 12345,
    onChange: state => states.push(state),
    interval: (callback, ms) => { assert.equal(ms, ORDER_POLL_INTERVAL_MS); tick = callback; return 1; },
    clear: id => { assert.equal(id, 1); cleared = true; },
  });
  t.after(() => feed.stop());
  return { feed, target, document, states, tick: () => tick(), setOnline: value => { online = value; }, get state() { return states.at(-1); }, get cleared() { return cleared; } };
}

test('every supported status and legacy alias maps to the correct stage', () => {
  TRACKING_STAGES.forEach((stage, index) => {
    for (const alias of stage.aliases) {
      const state = getTrackingState(order('id', alias.toLowerCase()));
      assert.equal(state.index, index); assert.equal(state.step, index + 1);
    }
  });
  for (const status of ['UNKNOWN', 'CANCELLED', null]) {
    const state = getTrackingState(order('id', status));
    assert.equal(state.step, 0); assert.equal(state.stage, null); assert.equal(state.otpType, null);
  }
});

test('pickup and delivery rider/code details follow the current leg, including picked-up and quality-check boundaries', () => {
  const pickupRider = { name: 'Pickup' }, deliveryRider = { name: 'Delivery' };
  const logistics = { assignedRider: pickupRider, pickupRider, deliveryRider };
  const tracked = status => getTrackingState({ ...order('id', status), logistics, items: [{ quantity: 2 }, { quantity: 6 }] });
  assert.equal(tracked('OUT_FOR_PICKUP').rider, pickupRider);
  assert.equal(tracked('OUT_FOR_PICKUP').otpType, 'pickup');
  assert.equal(tracked('PICKED_UP').otpType, null);
  assert.equal(tracked('PICKED_UP').pickup, false);
  assert.equal(tracked('IN_WASH').totalItems, 8);
  assert.equal(tracked('READY').rider, deliveryRider);
  assert.equal(tracked('QUALITY_CHECK').otpType, 'delivery');
  assert.equal(tracked('DELIVERED').otpType, null);
  assert.equal(getTrackingState({ ...order('id', 'IN_WASH'), logistics: { assignedRider: pickupRider } }).rider, null);
  assert.equal(getTrackingState({ ...order('id', 'BOOKED'), logistics: { pickedUpAt: new Date() } }).otpType, null);
});

test('selection survives API reordering and falls back only when the selected booking leaves the active list', () => {
  const a = order('a'), b = order('b');
  assert.equal(selectTrackedOrder([b, a], 'a'), a);
  assert.equal(selectTrackedOrder([b], 'a'), b);
  assert.equal(selectTrackedOrder([], 'a'), null);
});

test('visible polling updates within five seconds and merges repeated refresh triggers into one request', async t => {
  const response = deferred(); let calls = 0;
  const f = fixture(t, () => { calls++; return response.promise; });
  const a = f.feed.refresh(), b = f.tick();
  await Promise.resolve();
  assert.equal(calls, 1); assert.equal(a, b); assert.equal(ORDER_POLL_INTERVAL_MS, 5000);
  response.resolve(payload(order()));
  await a;
  assert.equal(f.state.orders[0].orderStatus, 'BOOKED');
  assert.equal(f.state.lastUpdated, 12345);
  assert.equal(f.state.refreshing, false);
});

test('focus, online, visibility, booking mutations and cross-tab changes request fresh data; hidden tabs pause polling', async t => {
  let calls = 0; const f = fixture(t, async () => { calls++; return payload(order()); });
  await f.feed.refresh();
  for (const event of ['focus', 'online', ORDER_CHANGED_EVENT]) {
    const before = calls; f.target.dispatchEvent(new Event(event)); await f.feed.refresh(); assert.equal(calls, before + 1);
  }
  const storage = new Event('storage'); storage.key = 'indodhobi:orders-revision';
  f.target.dispatchEvent(storage); await f.feed.refresh(); const before = calls;
  f.document.visibilityState = 'hidden';
  await f.tick(); f.target.dispatchEvent(new Event('focus')); assert.equal(calls, before);
  f.document.visibilityState = 'visible'; f.document.dispatchEvent(new Event('visibilitychange'));
  await f.feed.refresh(); assert.equal(calls, before + 1);
});

test('failed or malformed reads retain the last status, indicate stale data, and recover automatically', async t => {
  let result = payload(order()), fail = false;
  const f = fixture(t, async () => { if (fail) throw new Error('network'); return result; });
  await f.feed.refresh(); fail = true; await f.tick();
  assert.equal(f.state.error, 'unavailable'); assert.equal(f.state.orders[0].orderStatus, 'BOOKED');
  fail = false; result = { success: true, activeOrders: null }; await f.tick();
  assert.equal(f.state.error, 'unavailable'); assert.equal(f.state.lastUpdated, 12345);
  result = payload(order('one', 'IN_WASHING')); await f.tick();
  assert.equal(f.state.error, null); assert.equal(f.state.orders[0].orderStatus, 'IN_WASHING');
});

test('offline pauses requests and reconnect refreshes without clearing the last booking', async t => {
  let calls = 0; const f = fixture(t, async () => { calls++; return payload(order()); });
  await f.feed.refresh(); f.setOnline(false); f.target.dispatchEvent(new Event('offline'));
  await f.tick(); assert.equal(calls, 1); assert.equal(f.state.error, 'offline'); assert.equal(f.state.orders.length, 1);
  f.setOnline(true); f.target.dispatchEvent(new Event('online')); await f.feed.refresh();
  assert.equal(calls, 2); assert.equal(f.state.error, null);
});

test('session expiry clears private booking data, and completed/cancelled bookings leave the active list', async t => {
  let unauthorized = false, complete = false;
  const f = fixture(t, async () => {
    if (unauthorized) throw { response: { status: 401 } };
    return complete ? payload() : payload(order());
  });
  await f.feed.refresh(); complete = true; await f.tick(); assert.deepEqual(f.state.orders, []);
  complete = false; await f.tick(); unauthorized = true; await f.tick();
  assert.deepEqual(f.state.orders, []); assert.equal(f.state.error, 'auth'); assert.equal(f.state.lastUpdated, null);
});

test('unmount/account switch aborts in-flight requests, removes listeners and ignores late responses', async t => {
  const response = deferred(); let signal, calls = 0;
  const f = fixture(t, options => { signal = options.signal; calls++; return response.promise; });
  const pending = f.feed.refresh(); await Promise.resolve(); const length = f.states.length;
  f.feed.stop(); assert.equal(signal.aborted, true); assert.equal(f.cleared, true);
  response.resolve(payload(order('old-account'))); await pending;
  f.target.dispatchEvent(new Event(ORDER_CHANGED_EVENT)); await f.tick();
  assert.equal(f.states.length, length); assert.equal(calls, 1);
});

test('mutation notifications contain no booking/customer data and tolerate blocked browser storage', () => {
  const target = new EventTarget(); let events = 0, written;
  target.addEventListener(ORDER_CHANGED_EVENT, () => events++);
  target.localStorage = { setItem(key, value) { written = { key, value }; throw new Error('blocked'); } };
  assert.doesNotThrow(() => notifyOrdersChanged(target)); assert.equal(events, 1);
  assert.equal(written.key, 'indodhobi:orders-revision');
  assert.match(written.value, /^[0-9]+-0[.]/);
});
