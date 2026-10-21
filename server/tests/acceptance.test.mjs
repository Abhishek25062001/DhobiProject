import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';
import ServiceArea from '../models/ServiceArea.js';
import MediaAsset from '../models/MediaAsset.js';
import Order from '../models/Order.js';
import { serviceFromPrice } from '../../shared/pricing.mjs';

test('T15 cross-owner acceptance and checkout regressions', async t => {
  const { request } = await contentTestHarness(t);
  const config = await PlatformConfig.create({ gstPercentage: 0, deliveryFee: 0, expressSurcharge: 0 });
  const category = await Category.create({ name: 'Home', slug: 'home' });
  const assets = await MediaAsset.create([{ name: 'Towel', provider: 'local', url: '/images/laundry/shirt-after-480.webp' }, { name: 'Bedsheet', provider: 'local', url: '/images/laundry/laundry-atlas.webp' }]);
  const garments = await Garment.create(['Towel', 'Bedsheet'].map((name, index) => ({ name, shortName: name, category: category.name, categoryId: category._id, pricing: testPrices, primaryImage: { assetId: assets[index]._id } })));
  const area = await ServiceArea.create({ slug: 'acceptance', name: 'Acceptance hub', pincodes: ['110001'] });
  const slot = await TimeSlot.create({ label: 'Acceptance morning', startHour: 8, endHour: 10, maxCapacity: 1 });
  const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const body = { items: [{ garmentId: String(garments[0]._id), quantity: 1, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' }], preferences: { detergentType: 'Standard', packagingType: 'Folded' }, pickupAddress: { flatAndBuilding: '1 Test', streetAndLandmark: 'Test road', city: 'Test city', pincode: '110001', contactPhone: '9990000002' }, pickupSchedule: { date: day(20), timeSlot: slot.label }, deliverySchedule: { date: day(22), timeSlot: slot.label }, paymentMethod: 'COD' };
  let accepted;
  await t.test('public responses explicitly exclude arbitrary private fields and provider identifiers', async () => {
    for (const [model, id] of [[Category, category._id], [Garment, garments[0]._id], [PlatformConfig, config._id], [TimeSlot, slot._id], [ServiceArea, area._id], [MediaAsset, assets[0]._id]]) await model.collection.updateOne({ _id: id }, { $set: { privateAuditSecret: 'must-never-leak', cloudinaryPublicId: 'provider-only' } });
    for (const route of ['/config/public', '/catalog/garments', '/catalog/categories', '/service-areas', '/service-areas/check?pincode=110001']) {
      const result = await request(route); assert.equal(result.status, 200);
      assert.doesNotMatch(JSON.stringify(result.body), /must-never-leak|provider-only|privateAuditSecret/);
    }
    assert.equal((await request('/catalog/garments?includeInactive=true')).status, 401);
  });
  await t.test('replacing only a towel placement never changes bedsheet imagery; removal stays absent', async () => {
    const response = await request(`/catalog/garments/${garments[0]._id}`, { method: 'PUT', role: 'admin', body: { primaryImage: { assetId: assets[1]._id } } });
    assert.equal(response.status, 200);
    const beforeSheet = (await request('/catalog/garments')).body.data.find(g => g.name === 'Bedsheet');
    await request(`/catalog/garments/${garments[0]._id}`, { method: 'PUT', role: 'admin', body: { primaryImage: null } });
    const catalog = (await request('/catalog/garments')).body.data;
    assert.equal(catalog.find(g => g.name === 'Towel').primaryImage, null);
    assert.deepEqual(catalog.find(g => g.name === 'Bedsheet').primaryImage, beforeSheet.primaryImage);
  });
  await t.test('zero prices and disabled services agree in promotions, catalog and server quotes', async () => {
    await Garment.updateOne({ _id: garments[0]._id }, { 'pricing.washOnly': 0 });
    let bootstrap = (await request('/config/public')).body;
    assert.equal(serviceFromPrice(bootstrap.garments, bootstrap.config, 'WASH_AND_FOLD', 'NONE'), 0);
    assert.equal((await request('/orders/quote', { method: 'POST', role: 'customer', body })).body.quote.pricingBreakdown.grandTotal, 0);
    await PlatformConfig.updateOne({ _id: config._id }, { serviceTypes: [] });
    bootstrap = (await request('/config/public')).body;
    assert.equal(serviceFromPrice(bootstrap.garments, bootstrap.config, 'WASH_AND_FOLD', 'NONE'), null);
    assert.equal((await request('/orders/quote', { method: 'POST', role: 'customer', body })).status, 400);
    await PlatformConfig.updateOne({ _id: config._id }, { serviceTypes: config.serviceTypes });
  });
  await t.test('unavailable online payment leaves no fabricated order or paid result', async () => {
    const oldId = process.env.RAZORPAY_KEY_ID, oldSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = ''; process.env.RAZORPAY_KEY_SECRET = '';
    try {
      const result = await request('/orders', { method: 'POST', role: 'customer', body: { ...body, paymentMethod: 'ONLINE', onlineSubMethod: 'UPI' } });
      assert.equal(result.status, 503);
      assert.equal(await Order.countDocuments(), 0);
    } finally {
      if (oldId === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = oldId;
      if (oldSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = oldSecret;
    }
  });
  await t.test('concurrent orders cannot exceed the final remaining slot place', async () => {
    const results = await Promise.all([1, 2].map(() => request('/orders', { method: 'POST', role: 'customer', body })));
    assert.deepEqual(results.map(result => result.status).sort(), [201, 400]);
    assert.equal(await Order.countDocuments(), 1);
    accepted = results.find(result => result.status === 201).body.order;
  });
  await t.test('COD, cancelled and mismatched payment sessions are rejected before gateway verification', async () => {
    accepted ||= (await Order.findOne()).toObject();
    const verify = data => request('/orders/verify-payment', { method: 'POST', role: 'customer', body: { orderId: String(accepted._id), razorpay_order_id: 'different-session', razorpay_payment_id: 'fake', razorpay_signature: 'fake', ...data } });
    assert.match((await verify()).body.message, /invalid/);
    await Order.updateOne({ _id: accepted._id }, { 'payment.method': 'ONLINE', 'payment.razorpayOrderId': 'correct-session' });
    assert.match((await verify()).body.message, /invalid/);
    await Order.updateOne({ _id: accepted._id }, { orderStatus: 'CANCELLED' });
    assert.match((await verify({ razorpay_order_id: 'correct-session' })).body.message, /invalid/);
    assert.equal((await Order.findById(accepted._id)).payment.status, 'PENDING');
  });
});
