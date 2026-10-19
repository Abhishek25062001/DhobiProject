import { test } from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import { TRACKING_STAGES, ORDER_STATUS_VALUES, ORDER_STATUS_OPTIONS, orderStage, orderStatusLabel, isActiveOrder } from '../../shared/orderStages.mjs';
import { getTrackingState } from '../../client/src/utils/orderTracking.mjs';

test('the persisted status model, operational choices and customer journey share ten stages', () => {
  assert.equal(TRACKING_STAGES.length, 10);
  assert.deepEqual(TRACKING_STAGES.map(stage => stage.label), ['Order Placed', 'Confirmed', 'Pickup Scheduled', 'Out for Pickup', 'Picked Up', 'In Wash', 'Steam Press', 'Ready & QC', 'Out for Delivery', 'Delivered']);
  assert.deepEqual(Order.schema.path('orderStatus').enumValues, ORDER_STATUS_VALUES);
  assert.equal(new Set(ORDER_STATUS_VALUES).size, ORDER_STATUS_VALUES.length);
  assert.equal(ORDER_STATUS_OPTIONS.length, 11); // Ten stages plus cancellation, not an eleventh step.
  for (const status of ORDER_STATUS_VALUES) {
    if (status === 'CANCELLED') { assert.equal(orderStage(status), null); continue; }
    assert.ok(orderStage(status), status);
    assert.equal(orderStatusLabel(status), getTrackingState({ orderStatus: status }).stage.label);
  }
  assert.equal(getTrackingState({ orderStatus: 'PICKUP_ASSIGNED' }).step, 3);
  assert.equal(getTrackingState({ orderStatus: 'IN_WASHING' }).step, 6);
  assert.equal(getTrackingState({ orderStatus: 'QUALITY_CHECK' }).step, 8);
  assert.equal(getTrackingState({ orderStatus: 'UNKNOWN' }).step, 0);
});

test('order changes agree in active bookings, details and history; alias filters and ownership are preserved', async t => {
  const { request } = await contentTestHarness(t);
  const customer = await User.findOne({ role: 'customer' });
  const category = await Category.create({ name: 'Men' });
  const garment = await Garment.create({ name: 'Test shirt', category: 'Men', categoryId: category._id, pricing: testPrices });
  const base = {
    orderNumber: 'IDB-TEST-STAGES', customer: customer._id,
    items: [{ garment: garment._id, garmentName: 'Test shirt', category: 'Men', quantity: 1, serviceType: 'WASH_AND_IRON', ironingType: 'STANDARD_STEAM', unitPrice: 50, lineTotal: 50 }],
    pickupSchedule: { date: '2030-01-01', timeSlot: 'Morning' }, deliverySchedule: { date: '2030-01-03', timeSlot: 'Morning' },
    pickupAddress: { flatAndBuilding: 'Test building', streetAndLandmark: 'Test road', city: 'Delhi', pincode: '110001', contactPhone: '9990000002' },
    pricingBreakdown: { subtotal: 50, taxAmount: 0, grandTotal: 50 }, payment: { method: 'COD', status: 'PENDING' },
  };
  const order = await Order.create(base);
  const other = await Order.create({ ...base, orderNumber: 'IDB-OTHER', customer: (await User.findOne({ role: 'admin' }))._id });
  for (const stage of TRACKING_STAGES) {
    const update = await request(`/orders/${order._id}/status`, { method: 'PATCH', role: 'admin', body: { orderStatus: stage.status } });
    assert.equal(update.status, 200, JSON.stringify(update.body));
    const [active, history, details] = await Promise.all([
      request('/orders/my-active', { role: 'customer' }), request('/orders/my-orders', { role: 'customer' }), request(`/orders/${order._id}`, { role: 'customer' }),
    ]);
    assert.equal(history.body.orders.length, 1); // Another account's order never appears.
    assert.equal(history.body.orders[0].orderStatus, stage.status);
    assert.equal(details.body.order.orderStatus, stage.status);
    assert.equal(active.body.activeOrders.length, isActiveOrder(history.body.orders[0]) ? 1 : 0);
    if (active.body.activeOrders.length) assert.equal(getTrackingState(active.body.activeOrders[0]).step, getTrackingState(details.body.order).step);
  }
  await request(`/orders/${order._id}/status`, { method: 'PATCH', role: 'admin', body: { orderStatus: 'CANCELLED' } });
  const cancelled = await request('/orders/my-orders', { role: 'customer' });
  assert.equal(cancelled.body.orders[0].orderStatus, 'CANCELLED');
  assert.equal((await request('/orders/my-active', { role: 'customer' })).body.activeOrders.length, 0);
  assert.equal((await request(`/orders/${other._id}`, { role: 'customer' })).status, 403);
  for (const [canonical, alias] of [['IN_WASHING', 'IN_WASH'], ['PICKUP_ASSIGNED', 'PICKUP_SCHEDULED'], ['QUALITY_CHECK', 'READY']]) {
    await Order.updateOne({ _id: order._id }, { orderStatus: alias });
    const filtered = await request(`/orders/all?status=${canonical}`, { role: 'admin' });
    assert.equal(filtered.body.orders.length, 1);
    assert.equal(filtered.body.orders[0].orderStatus, alias);
  }
});
