import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_DRAFT_KEY, readBookingDraft, readDraftCart, saveBookingDraft } from '../src/utils/bookingDraft.js';

const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};
beforeEach(() => storage.clear());
const shirt = { garment: { _id: 'shirt', pricing: { washOnly: 35 } }, quantity: 2, unitPrice: 35, lineTotal: 70, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' };

test('homepage quantity edits replace the old basket while retaining scheduling and preferences', () => {
  sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ cartItems: [shirt], activeStep: 3, pickupSchedule: { date: '2026-12-01' }, preferences: { packagingType: 'On Hangers' } }));
  saveBookingDraft({ cartItems: [{ ...shirt, quantity: 3, lineTotal: 105 }] });
  const draft = readBookingDraft();
  assert.equal(readDraftCart(draft)[0].quantity, 3);
  assert.equal(draft.activeStep, 3);
  assert.equal(draft.pickupSchedule.date, '2026-12-01');
  assert.equal(draft.preferences.packagingType, 'On Hangers');
});

test('removing the last homepage item does not restore an older nonempty basket', () => {
  saveBookingDraft({ cartItems: [shirt] });
  saveBookingDraft({ cartItems: [] });
  assert.deepEqual(readDraftCart(readBookingDraft()), []);
});

test('clearing the cart after checkout does not recreate the completed draft', () => {
  saveBookingDraft({ cartItems: [shirt] });
  sessionStorage.removeItem(BOOKING_DRAFT_KEY);
  saveBookingDraft({ cartItems: [] });
  assert.equal(sessionStorage.getItem(BOOKING_DRAFT_KEY), null);
});

test('malformed or incompatible storage never prevents the page from opening', () => {
  for (const invalid of ['{broken', 'null', '[]', '42']) {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, invalid);
    assert.deepEqual(readBookingDraft(), {});
  }
  assert.deepEqual(readDraftCart({ cartItems: [{}, { ...shirt, quantity: -1 }, { ...shirt, unitPrice: -1 }, { ...shirt, lineTotal: -1 }, { ...shirt, quantity: 1000 }, { ...shirt, quantity: 1.5 }, shirt] }), [shirt]);
});

test('unavailable browser storage does not prevent in-memory booking', () => {
  const availableStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { throw new Error('Storage disabled'); } };
  try {
    assert.deepEqual(readBookingDraft(), {});
    assert.doesNotThrow(() => saveBookingDraft({ cartItems: [shirt] }));
  } finally { globalThis.sessionStorage = availableStorage; }
});
