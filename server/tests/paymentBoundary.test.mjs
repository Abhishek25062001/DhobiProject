import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRazorpayOrder, verifyRazorpaySignature } from '../utils/razorpay.js';

test('T15 gateway failures never fabricate a successful payment session', async () => {
  await assert.rejects(createRazorpayOrder(10, 'fixture', { gateway: null }), error => error.statusCode === 503);
  await assert.rejects(createRazorpayOrder(10, 'fixture', { gateway: { orders: { create: async () => { throw new Error('Controlled outage'); } } } }), error => error.statusCode === 503);
  await assert.rejects(createRazorpayOrder(10, 'fixture', { gateway: { orders: { create: async () => ({ id: 'bad', amount: 1, currency: 'INR' }) } } }), error => error.statusCode === 503);
  const result = await createRazorpayOrder(10.25, 'fixture', { gateway: { orders: { create: async payload => ({ id: 'order_fixture', ...payload }) } } });
  assert.equal(result.amount, 1025); assert.equal(result.isSimulated, false);
});
test('T15 checkout verifies exact signatures with the API secret and no webhook secret', () => {
  const original = process.env.RAZORPAY_KEY_SECRET;
  const originalWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'isolated-boundary-secret';
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  try {
    assert.equal(verifyRazorpaySignature('order_sim_fixture', 'fake', 'simulated_valid_signature'), false);
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_fixture|payment_fixture').digest('hex');
    assert.equal(verifyRazorpaySignature('order_fixture', 'payment_fixture', signature), true);
    assert.equal(verifyRazorpaySignature('order_other', 'payment_fixture', signature), false);
    assert.equal(verifyRazorpaySignature('order_fixture', 'payment_fixture', 'x'.repeat(64)), false);
    delete process.env.RAZORPAY_KEY_SECRET;
    assert.equal(verifyRazorpaySignature('order_sim_fixture', 'fake', 'simulated_valid_signature'), false);
  } finally {
    if (original === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = original;
    if (originalWebhook === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhook;
  }
});
