import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import ServiceArea from '../models/ServiceArea.js';
import PlatformConfig from '../models/PlatformConfig.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import TimeSlot from '../models/TimeSlot.js';
import Order from '../models/Order.js';
import { preparePayment, reconcilePayment, applyCapturedPayment, refundCancelledOrder } from '../services/payments.js';

test('transaction integrity under contention and uncertain gateway outcomes', async t => {
  const { request, users } = await contentTestHarness(t);
  const peer = await request('/auth/register', { method: 'POST', body: { name: 'Other buyer', email: 'peer@example.test', phone: '9777777777', password: 'Long-password-123' } });
  users.peer = peer.body.token;
  await Order.init();
  await ServiceArea.create({ slug: 'integrity', name: 'Integrity hub', pincodes: ['110001'] });
  await PlatformConfig.create({ detergentOptions: [{ code: 'standard', name: 'Standard' }], packagingOptions: [{ code: 'bag', name: 'Bag' }] });
  const category = await Category.create({ name: 'Test' });
  const garment = await Garment.create({ name: 'Shirt', category: category.name, categoryId: category._id, pricing: testPrices });
  const slot = await TimeSlot.create({ label: 'Integrity morning', startHour: 8, endHour: 10, maxCapacity: 1 });
  const date = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const body = (offset = 10) => ({ idempotencyKey: crypto.randomUUID(), items: [{ garmentId: String(garment._id), quantity: 1, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' }], preferences: { detergentType: 'standard', packagingType: 'bag' }, pickupSchedule: { date: date(offset), timeSlot: slot.label }, deliverySchedule: { date: date(offset + 3), timeSlot: slot.label }, pickupAddress: { flatAndBuilding: '1 Test', streetAndLandmark: 'Test road', city: 'Delhi', pincode: '110001', contactPhone: '9990000002' }, paymentMethod: 'COD', isExpress: false });
  const submit = (payload, role = 'customer') => request('/orders', { method: 'POST', body: payload, role });
  let created;
  await t.test('eight concurrent purchases of the last pickup slot accept exactly one', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => submit(body(), i % 2 ? 'peer' : 'customer')));
    assert.equal(results.filter(r => r.status === 201).length, 1, JSON.stringify(results));
    assert.equal(await Order.countDocuments(), 1);
    created = results.find(r => r.status === 201).body.order;
    const detail = await request(`/orders/${created._id}`, { role: 'customer' });
    if (detail.status === 403) [users.customer, users.peer] = [users.peer, users.customer];
    assert.equal((await request(`/orders/${created._id}/retry-payment`, { method: 'POST', role: 'peer', body: {} })).status, 403);
  });
  await t.test('last delivery slot is protected even with different pickup dates', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => submit({ ...body(20 + i), deliverySchedule: { date: date(30), timeSlot: slot.label } })));
    assert.equal(results.filter(r => r.status === 201).length, 1);
  });
  await t.test('duplicate submission and refresh recover one order; changed payload is rejected', async () => {
    await TimeSlot.updateOne({ _id: slot._id }, { maxCapacity: 30 });
    const payload = body(40);
    await Promise.all(Array.from({ length: 6 }, () => submit(payload)));
    assert.equal(await Order.countDocuments({ checkoutKey: payload.idempotencyKey }), 1);
    const recovered = await submit(payload);
    assert.equal(recovered.status, 200);
    assert.equal((await submit({ ...payload, isExpress: true })).status, 409);
    assert.equal((await submit({ ...body(), idempotencyKey: '' })).status, 400);
  });
  let online;
  let creates = 0;
  const gateway = { orders: {
    create: async data => { creates++; await new Promise(r => setTimeout(r, 20)); return { id: 'order_integrity', ...data }; },
    fetch: async () => ({ id: 'order_integrity', amount: Math.round(online.pricingBreakdown.grandTotal * 100), currency: 'INR', status: 'created' }),
    fetchPayments: async () => ({ items: [] })
  } };
  await t.test('parallel payment initialization calls the provider once and retries reuse the session', async () => {
    online = await Order.findById(created._id);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => preparePayment(online, { gateway })));
    assert.equal(creates, 1);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    online = await Order.findById(created._id);
    assert.equal((await preparePayment(online, { gateway })).razorpay.id, 'order_integrity');
    assert.equal(creates, 1);
  });
  const capture = () => ({ id: 'pay_integrity', order_id: 'order_integrity', amount: Math.round(online.pricingBreakdown.grandTotal * 100), currency: 'INR', status: 'captured', captured: true });
  await t.test('authorized payments, amount/currency mismatches and provider timeouts fail closed', async () => {
    for (const patch of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'other' }, { status: 'authorized', captured: false }]) await assert.rejects(applyCapturedPayment(online._id, { ...capture(), ...patch }));
    await assert.rejects(reconcilePayment(online, { gateway: { orders: { fetch: async () => { throw new Error('timeout'); }, fetchPayments: async () => ({ items: [] }) } } }));
    await assert.rejects(reconcilePayment(online, { gateway: { orders: { ...gateway.orders, fetchPayments: async () => ({ items: [{ ...capture(), status: 'authorized' }] }) } } }));
    assert.equal((await Order.findById(online._id)).payment.status, 'PENDING');
  });
  await t.test('concurrent captures apply once; browser failure cannot downgrade payment', async () => {
    const before = (await Order.findById(online._id)).statusHistory.length;
    await Promise.all(Array.from({ length: 8 }, () => applyCapturedPayment(online._id, capture())));
    const stored = await Order.findById(online._id);
    assert.equal(stored.payment.status, 'PAID');
    assert.equal(stored.statusHistory.length, before + 1);
    await request(`/orders/${online._id}/payment-failed`, { method: 'POST', role: 'customer', body: { paymentId: 'forged', reason: 'dismissed' } });
    assert.equal((await Order.findById(online._id)).payment.razorpayPaymentId, 'pay_integrity');
  });
  await t.test('paid cancellation requests refund without fabricating one; late callbacks do not resurrect booking', async () => {
    assert.equal((await request(`/orders/${online._id}/cancel`, { method: 'POST', role: 'customer', body: {} })).status, 200);
    await applyCapturedPayment(online._id, capture());
    const stored = await Order.findById(online._id);
    assert.equal(stored.orderStatus, 'CANCELLED'); assert.equal(stored.payment.status, 'PAID'); assert.equal(stored.payment.refundRequired, true);
    assert.equal((await request(`/orders/${online._id}/switch-to-cod`, { method: 'POST', role: 'customer', body: {} })).status, 409);
  });
  await t.test('uncertain initialization persists a lock and never creates another gateway order', async () => {
    const fresh = await submit(body(50));
    let order = await Order.findById(fresh.body.order._id);
    let attempts = 0;
    const unavailable = { orders: { create: async () => { attempts++; throw new Error('ambiguous timeout'); } } };
    await assert.rejects(preparePayment(order, { gateway: unavailable }));
    order = await Order.findById(order._id);
    assert.equal(order.payment.sessionState, 'UNKNOWN');
    await assert.rejects(preparePayment(order, { gateway: unavailable }));
    assert.equal(attempts, 1);
  });
  await t.test('registration cannot create staff and sensitive actions require ownership', async () => {
    const registered = await request('/auth/register', { method: 'POST', body: { name: 'Attacker', email: 'attacker@example.test', phone: '9888888888', password: 'Long-password-123', role: 'admin' } });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.role, 'customer');
    assert.equal((await request(`/orders/${online._id}/retry-payment`, { method: 'POST', body: {} })).status, 401);
    assert.equal((await request('/orders/bad/retry-payment', { method: 'POST', role: 'customer', body: {} })).status, 400);
    assert.equal((await request(`/orders/${online._id}/status`, { method: 'PATCH', role: 'admin', body: { paymentStatus: 'PAID' } })).status, 400);
  });
  await t.test('raw signed callbacks tolerate whitespace, deduplicate and reject tampering', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'isolated-webhook-secret';
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: capture() } } }, null, 2);
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
    const options = { method: 'POST', rawBody: raw, headers: { 'x-razorpay-signature': signature } };
    const before = (await Order.findById(online._id)).statusHistory.length;
    assert.equal((await request('/orders/webhook/razorpay', options)).status, 200);
    assert.equal((await request('/orders/webhook/razorpay', options)).status, 200);
    assert.equal((await Order.findById(online._id)).statusHistory.length, before);
    assert.equal((await request('/orders/webhook/razorpay', { ...options, rawBody: raw + ' ' })).status, 400);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });
  await t.test('failed database insert rolls back booking capacity', async context => {
    const initial = await Order.countDocuments();
    context.mock.method(Order, 'create', async () => { throw new Error('controlled insert failure'); });
    const result = await submit(body(70));
    assert.equal(result.status, 500);
    assert.doesNotMatch(result.body.message, /controlled insert/);
    assert.equal(await Order.countDocuments(), initial);
    assert.equal((await request(`/orders/slots?date=${date(70)}`)).body.slots[0].bookedCount, 0);
  });
  await t.test('refund is requested once under contention and only confirmed from provider evidence', async () => {
    let refunds = 0;
    let processed = false;
    const refundGateway = { payments: {
      fetch: async () => processed ? { ...capture(), status: 'refunded', amount_refunded: capture().amount } : capture(),
      refund: async (id, payload) => { refunds++; return { id: 'rfnd_integrity', payment_id: id, amount: payload.amount, status: 'pending' }; }
    } };
    const cancelled = await Order.findById(online._id);
    await Promise.all(Array.from({ length: 5 }, () => refundCancelledOrder(cancelled, { gateway: refundGateway })));
    assert.equal(refunds, 1);
    assert.equal((await Order.findById(online._id)).payment.status, 'PAID');
    processed = true;
    await refundCancelledOrder(await Order.findById(online._id), { gateway: refundGateway });
    const refunded = await Order.findById(online._id);
    assert.equal(refunded.payment.status, 'REFUNDED'); assert.equal(refunded.payment.refundRequired, false);
    await applyCapturedPayment(online._id, capture());
    assert.equal((await Order.findById(online._id)).payment.status, 'REFUNDED');
  });

  await t.test('capture after unpaid cancellation records funds and refund obligation without restoring capacity', async () => {
    const fresh = await submit(body(80));
    const id = fresh.body.order._id;
    await Order.updateOne({ _id: id }, { 'payment.method': 'ONLINE', 'payment.razorpayOrderId': 'order_late' });
    await request(`/orders/${id}/cancel`, { method: 'POST', role: 'customer', body: {} });
    const captured = await applyCapturedPayment(id, { ...capture(), id: 'pay_late', order_id: 'order_late' });
    assert.equal(captured.orderStatus, 'CANCELLED'); assert.equal(captured.payment.status, 'PAID'); assert.equal(captured.payment.refundRequired, true);
    assert.equal((await request(`/orders/slots?date=${date(80)}`)).body.slots[0].bookedCount, 0);
  });
  await t.test('provider success followed by database failure blocks a second session', async context => {
    const fresh = await submit(body(90));
    const order = await Order.findById(fresh.body.order._id);
    const original = Order.findOneAndUpdate.bind(Order);
    context.mock.method(Order, 'findOneAndUpdate', (filter, update, options) => {
      if (update.$set?.['payment.razorpayOrderId']) throw new Error('controlled persistence outage');
      return original(filter, update, options);
    });
    let calls = 0;
    const provider = { orders: { create: async data => { calls++; return { id: 'order_persist_failure', ...data }; } } };
    await assert.rejects(preparePayment(order, { gateway: provider }));
    const uncertain = await Order.findById(order._id);
    assert.equal(uncertain.payment.sessionState, 'UNKNOWN');
    await assert.rejects(preparePayment(uncertain, { gateway: provider }));
    assert.equal(calls, 1);
  });

  await t.test('riders see only their assignments, never OTPs, and cannot steal another task', async () => {
    const rider = await User.create({ name: 'Assigned rider', email: 'rider@example.test', phone: '9666666666', password: 'Long-password-123', role: 'rider' });
    const other = await User.create({ name: 'Other rider', email: 'rider2@example.test', phone: '9555555555', password: 'Long-password-123', role: 'rider' });
    users.rider = jwt.sign({ id: rider._id }, process.env.JWT_SECRET);
    users.rider2 = jwt.sign({ id: other._id }, process.env.JWT_SECRET);
    const fresh = await submit(body(110));
    const id = fresh.body.order._id;
    await Order.updateOne({ _id: id }, { orderStatus: 'PICKUP_ASSIGNED', 'logistics.pickupRider': rider._id, 'logistics.assignedRider': rider._id });
    const own = await request(`/orders/${id}`, { role: 'rider' });
    assert.equal(own.status, 200); assert.equal(own.body.order.verificationCodes, undefined); assert.equal(own.body.order.pickupOtp, undefined);
    assert.equal((await request(`/orders/${id}`, { role: 'rider2' })).status, 403);
    assert.equal((await request(`/orders/${id}/accept-task`, { method: 'POST', role: 'rider2', body: {} })).status, 403);
    const listed = await request('/orders/all?search=IDB', { role: 'rider' });
    assert.equal(listed.body.orders.length, 1); assert.equal(listed.body.orders[0]._id, id);
    assert.equal(listed.body.orders[0].verificationCodes, undefined);
    assert.equal((await request(`/orders/${id}/verify-pickup`, { method: 'POST', role: 'rider2', body: { otp: fresh.body.order.pickupOtp, bagTagId: 'TEST' } })).status, 403);
  });

});
