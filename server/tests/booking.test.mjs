import ServiceArea from '../models/ServiceArea.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { invoiceIdentity, orderServiceLabel } from '../../shared/orderSnapshot.mjs';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('T07 authoritative booking and immutable invoice snapshots', async t => {
  const { request } = await contentTestHarness(t);
  await ServiceArea.create({ slug: 'test-hub', name: 'Test hub', pincodes: ['110001'] });
  const config = await PlatformConfig.create({ businessName: 'Original business', gstPercentage: 18, detergentOptions: [{ code: 'special', name: 'Special detergent', extraPricePerOrder: 12.75 }], packagingOptions: [{ code: 'bag', name: 'Reusable bag', extraPricePerOrder: 5.25 }] });
  const category = await Category.create({ name: 'Men' });
  const garment = await Garment.create({ name: 'Original shirt', category: category.name, categoryId: category._id, pricing: testPrices });
  const custom = await Garment.create({ name: 'Custom', category: category.name, categoryId: category._id, pricing: testPrices, isCustom: true });
  const slot = await TimeSlot.create({ label: 'Morning', startHour: 8, endHour: 10, maxCapacity: 20 });
  const futureDate = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const valid = () => ({ items: [{ garmentId: String(garment._id), quantity: 2, serviceType: 'WASH_AND_IRON', ironingType: 'STANDARD_STEAM' }], preferences: { detergentType: 'special', packagingType: 'bag' }, pickupSchedule: { date: futureDate(10), timeSlot: slot.label }, deliverySchedule: { date: futureDate(12), timeSlot: slot.label }, pickupAddress: { flatAndBuilding: '1 Test building', streetAndLandmark: 'Test road', city: 'Test city', pincode: '110001', contactPhone: '9990000002' }, paymentMethod: 'COD', isExpress: false });
  const submit = body => request('/orders', { method: 'POST', role: 'customer', body });
  let accepted;
  await t.test('forged totals and labels are ignored; exact amounts and identity are snapshotted', async () => {
    const body = valid();
    body.items[0].unitPrice = 1;
    body.items[0].garmentName = 'Forged name';
    body.pricingBreakdown = { grandTotal: 1 };
    body.billingSnapshot = { businessName: 'Forged business' };
    const response = await submit(body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    accepted = response.body.order;
    assert.equal(accepted.items[0].unitPrice, 50);
    assert.equal(accepted.items[0].garmentName, 'Original shirt');
    assert.equal(accepted.pricingBreakdown.subtotal, 100);
    assert.equal(accepted.pricingBreakdown.extraPreferenceFee, 18);
    assert.equal(accepted.pricingBreakdown.grandTotal, 197.06);
    assert.equal(accepted.billingSnapshot.businessName, 'Original business');
    assert.equal(accepted.preferences.detergentTypeLabel, 'Special detergent');
    assert.equal(accepted.customerSnapshot.name, 'Test customer');
  });
  await t.test('malformed quantities, selections, custom overrides and addresses are rejected before creating orders', async () => {
    for (const quantity of [-1, 0, 1.5, '2', 1000]) { const body = valid(); body.items[0].quantity = quantity; assert.equal((await submit(body)).status, 400); }
    for (const patch of [{ garmentId: 'bad' }, { serviceType: 'UNKNOWN' }, { ironingType: 'NONE' }, { serviceType: 'DRY_CLEAN', ironingType: 'STANDARD_STEAM' }, { isCustomItem: true }, { garmentId: String(custom._id), customDescription: '' }]) {
      const body = valid(); Object.assign(body.items[0], patch); assert.equal((await submit(body)).status, 400);
    }
    for (const patch of [{ pickupAddress: {} }, { pickupAddress: { ...valid().pickupAddress, pincode: '000000' } }, { paymentMethod: 'FREE' }, { paymentMethod: 'ONLINE', onlineSubMethod: 'FAKE' }, { preferences: { detergentType: 'missing', packagingType: 'bag' } }, { isExpress: 'false' }]) assert.equal((await submit({ ...valid(), ...patch })).status, 400);
    assert.equal(await Order.countDocuments(), 1);
  });
  await t.test('inactive category, garment, service, finish and preferences block new bookings', async () => {
    for (const [model, id, path, value] of [[Category, category._id, 'isActive', false], [Garment, garment._id, 'isActive', false], [Garment, garment._id, 'allowedServices', []], [PlatformConfig, config._id, 'serviceTypes.1.isActive', false], [PlatformConfig, config._id, 'ironingTiers.0.isActive', false], [PlatformConfig, config._id, 'detergentOptions.0.isActive', false]]) {
      const record = await model.findById(id);
      const original = record.get(path);
      await model.updateOne({ _id: id }, { $set: { [path]: value } });
      assert.equal((await submit(valid())).status, 400, path);
      await model.updateOne({ _id: id }, { $set: { [path]: original } });
    }
  });
  await t.test('unknown, inactive, impossible, past, full and too-soon slots are rejected', async () => {
    for (const pickupSchedule of [{ date: '2030-02-30', timeSlot: slot.label }, { date: '2000-01-01', timeSlot: slot.label }, { date: futureDate(10), timeSlot: 'Unknown' }]) assert.equal((await submit({ ...valid(), pickupSchedule })).status, 400);
    assert.equal((await submit({ ...valid(), deliverySchedule: { date: futureDate(11), timeSlot: slot.label } })).status, 400);
    await TimeSlot.updateOne({ _id: slot._id }, { isActive: false });
    assert.equal((await submit(valid())).status, 400);
    assert.deepEqual((await request(`/orders/slots?date=${futureDate(10)}`)).body.slots, []);
    await TimeSlot.updateOne({ _id: slot._id }, { isActive: true, maxCapacity: 1 });
    assert.equal((await submit(valid())).status, 400);
    await TimeSlot.updateOne({ _id: slot._id }, { maxCapacity: 20 });
    assert.equal((await request('/orders/slots?date=2030-02-30')).status, 400);
  });
  await t.test('coupon estimate and booking use identical precision, zero caps and server subtotal', async () => {
    await Coupon.create({ code: 'SAVE', description: 'Test', discountType: 'PERCENTAGE', discountValue: 12.34, maxDiscountAmount: 0, expiresAt: new Date(Date.now() + 86400000) });
    const estimate = await request('/orders/validate-coupon', { method: 'POST', role: 'customer', body: { code: 'SAVE', subtotal: 100 } });
    assert.equal(estimate.body.discountAmount, 0);
    assert.equal((await submit({ ...valid(), couponCode: 'SAVE', subtotal: 100000 })).body.order.pricingBreakdown.discountAmount, 0);
    await Coupon.updateOne({ code: 'SAVE' }, { maxDiscountAmount: null });
    assert.equal((await submit({ ...valid(), couponCode: 'SAVE' })).body.order.pricingBreakdown.discountAmount, 12.34);
    assert.equal((await submit({ ...valid(), couponCode: 'UNKNOWN' })).status, 400);
  });
  await t.test('accepted invoice survives catalog, category and configuration edits; new bookings use updated values', async () => {
    await Garment.updateOne({ _id: garment._id }, { name: 'New shirt', 'pricing.washOnly': 75 });
    await Category.updateOne({ _id: category._id }, { name: 'Renamed men' });
    await PlatformConfig.updateOne({ _id: config._id }, { businessName: 'New business', gstPercentage: 0, 'serviceTypes.1.name': 'New service' });
    const historical = (await request(`/orders/${accepted._id}`, { role: 'customer' })).body.order;
    assert.equal(historical.items[0].garmentName, 'Original shirt');
    assert.equal(historical.items[0].category, 'Men');
    assert.equal(historical.pricingBreakdown.grandTotal, 197.06);
    assert.equal(invoiceIdentity(historical).businessName, 'Original business');
    assert.equal(invoiceIdentity(historical).gstPercentage, 18);
    assert.notEqual(orderServiceLabel(historical.items[0]), 'New service');
    const fresh = (await submit(valid())).body.order;
    assert.equal(fresh.items[0].garmentName, 'New shirt');
    assert.equal(fresh.items[0].unitPrice, 90);
    assert.equal(fresh.items[0].category, 'Renamed men');
    assert.equal(fresh.items[0].serviceLabel, 'New service');
    assert.equal(fresh.billingSnapshot.businessName, 'New business');
    assert.equal(fresh.pricingBreakdown.taxAmount, 0);
    const legacy = invoiceIdentity({ pricingBreakdown: { taxAmount: 12 } });
    assert.equal(legacy.gstPercentage, null);
    assert.equal(legacy.businessName, 'Business identity not recorded');
  });
  await t.test('coverage edits reject new bookings while accepted orders retain their hub snapshot', async () => {
    assert.equal(accepted.billingSnapshot.coverage.name, 'Test hub');
    assert.equal((await submit({ ...valid(), pickupAddress: { ...valid().pickupAddress, pincode: '110084' } })).status, 400);
    await ServiceArea.updateOne({ slug: 'test-hub' }, { isActive: false, name: 'Archived hub', revision: 2 });
    assert.equal((await submit(valid())).status, 400);
    const historical = (await request(`/orders/${accepted._id}`, { role: 'customer' })).body.order;
    assert.equal(historical.billingSnapshot.coverage.name, 'Test hub');
    await ServiceArea.updateOne({ slug: 'test-hub' }, { isActive: true });
    assert.equal((await submit(valid())).status, 201);
  });

});
