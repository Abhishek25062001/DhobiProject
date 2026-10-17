import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import PlatformConfig from '../models/PlatformConfig.js';
import ServiceArea from '../models/ServiceArea.js';
import TimeSlot from '../models/TimeSlot.js';
import Order from '../models/Order.js';

test('T13 public revisions and checkout quote review', async t => {
  const { request } = await contentTestHarness(t);
  await PlatformConfig.create({ gstPercentage: 0 });
  const category = await Category.create({ name: 'Men' });
  const garment = await Garment.create({ name: 'Shirt', categoryId: category._id, category: category.name, pricing: testPrices });
  await ServiceArea.create({ name: 'Hub', slug: 'hub', pincodes: ['110001'] });
  await TimeSlot.create({ label: 'Morning', startHour: 8, endHour: 10 });
  const day = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const body = { items: [{ garmentId: String(garment._id), quantity: 1, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' }], preferences: { detergentType: 'Standard', packagingType: 'Folded' }, pickupAddress: { flatAndBuilding: '1 Test', streetAndLandmark: 'Test road', city: 'Test city', pincode: '110001', contactPhone: '9990000002' }, pickupSchedule: { date: day(10), timeSlot: 'Morning' }, deliverySchedule: { date: day(12), timeSlot: 'Morning' }, paymentMethod: 'COD' };
  await t.test('unchanged payloads have stable revisions and owner edits change affected projections', async () => {
    const catalog = (await request('/catalog/garments')).body;
    const bootstrap = (await request('/config/public')).body;
    assert.ok(catalog.revision); assert.ok(bootstrap.revision);
    assert.equal((await request('/catalog/garments')).body.revision, catalog.revision);
    await Garment.updateOne({ _id: garment._id }, { name: 'Fresh shirt' });
    assert.notEqual((await request('/catalog/garments')).body.revision, catalog.revision);
    assert.notEqual((await request('/config/public')).body.revision, bootstrap.revision);
  });
  await t.test('preview is read-only; a stale accepted quote cannot create an order', async () => {
    assert.equal((await request('/orders/quote', { method: 'POST', body })).status, 401);
    const preview = (await request('/orders/quote', { method: 'POST', role: 'customer', body })).body;
    assert.ok(preview.fingerprint); assert.equal(await Order.countDocuments(), 0);
    await Garment.updateOne({ _id: garment._id }, { 'pricing.washOnly': 85 });
    const stale = await request('/orders', { method: 'POST', role: 'customer', body: { ...body, quoteFingerprint: preview.fingerprint } });
    assert.equal(stale.status, 409); assert.equal(await Order.countDocuments(), 0);
    assert.equal(stale.body.quote.items[0].unitPrice, 85);
    const fresh = (await request('/orders/quote', { method: 'POST', role: 'customer', body })).body;
    const accepted = await request('/orders', { method: 'POST', role: 'customer', body: { ...body, quoteFingerprint: fresh.fingerprint } });
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
    assert.equal(accepted.body.order.items[0].unitPrice, 85);
  });
});
