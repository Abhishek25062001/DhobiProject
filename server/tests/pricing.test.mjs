import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateItemUnitPrice, calculateTotals, availableServices, availableFinishes, selectionAvailable, preferredFinish } from '../../shared/pricing.mjs';
import { SERVICE_CODES, IRONING_CODES } from '../../shared/catalogContract.mjs';
import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';
import { optionsMigration } from '../services/optionsMigration.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

const garment = { pricing: testPrices, isActive: true, allowedServices: [...SERVICE_CODES], allowedIroningTiers: IRONING_CODES.filter(code => code !== 'NONE') };
test('T06 shared pricing: services, precision, fees and zero values', async t => {
  const config = new PlatformConfig().toObject();
  await t.test('each allowed service/finish has the same canonical rate', () => {
    for (const finish of ['STANDARD_STEAM', 'CRISP_STARCH', 'DELICATE_PRESS']) {
      const rate = { STANDARD_STEAM: 15, CRISP_STARCH: 25, DELICATE_PRESS: 30 }[finish];
      assert.equal(calculateItemUnitPrice(garment, 'WASH_AND_IRON', finish), 35 + rate);
      assert.equal(calculateItemUnitPrice(garment, 'IRON_ONLY', finish), rate);
    }
    assert.equal(calculateItemUnitPrice(garment, 'WASH_AND_FOLD', 'NONE'), 35);
    assert.equal(calculateItemUnitPrice(garment, 'DRY_CLEAN', 'NONE'), 90);
    assert.throws(() => calculateItemUnitPrice(garment, 'UNKNOWN'));
  });
  await t.test('decimal addition and GST round to paise and fees apply once per order', () => {
    const price = calculateItemUnitPrice({ pricing: { ...testPrices, washOnly: 10.01, standardSteamIron: 5.02 } }, 'WASH_AND_IRON', 'STANDARD_STEAM');
    assert.equal(price, 15.03);
    const totals = calculateTotals({ items: [{ unitPrice: price, quantity: 3 }], config: { ...config, freeDeliveryThreshold: 100, deliveryFee: 2.5, expressSurcharge: 3.75, gstPercentage: 18, detergentOptions: [{ code: 'X', extraPricePerOrder: 1.25, isActive: true }], packagingOptions: [] }, preferences: { detergentType: 'X' }, isExpress: true, discountAmount: 5.01 });
    assert.equal(totals.subtotal, 45.09);
    assert.equal(totals.extraPreferenceFee, 1.25);
    assert.equal(totals.taxAmount, 8.56);
    assert.equal(totals.grandTotal, 56.14);
  });
  await t.test('zero prices, zero thresholds, no GST and empty baskets remain zero', () => {
    const zeroConfig = { ...config, freeDeliveryThreshold: 0, deliveryFee: 0, expressSurcharge: 0, gstPercentage: 0 };
    const result = calculateTotals({ items: [{ unitPrice: 0, quantity: 1 }], config: zeroConfig, isExpress: true });
    assert.equal(result.grandTotal, 0);
    assert.equal(result.pickupDeliveryFee, 0);
    assert.equal(calculateTotals({ items: [], config, isExpress: true }).grandTotal, 0);
    assert.equal(calculateTotals({ items: [{ unitPrice: 399, quantity: 1 }], config }).pickupDeliveryFee, 0);
    assert.throws(() => calculateTotals({ items: [{ unitPrice: 5, quantity: 1.5 }], config }));
    assert.throws(() => calculateTotals({ items: [{ unitPrice: -1, quantity: 1 }], config }));
  });
  await t.test('availability is the intersection of product and platform options', () => {
    assert.equal(availableServices(garment, config).length, 4);
    assert.equal(availableFinishes(garment, config).length, 3);
    assert.equal(selectionAvailable(garment, config, 'IRON_ONLY', 'NONE'), false);
    assert.equal(selectionAvailable(garment, config, 'DRY_CLEAN', 'STANDARD_STEAM'), false);
    assert.equal(preferredFinish(garment, config, 'DRY_CLEAN', 'STANDARD_STEAM'), 'NONE');
    assert.equal(availableServices(garment, { ...config, ironingTiers: [] }).length, 2);
    assert.deepEqual(availableServices(garment, { ...config, serviceTypes: [] }), []);
    assert.equal(selectionAvailable({ ...garment, allowedServices: [] }, config, 'WASH_AND_FOLD', 'NONE'), false);
    assert.equal(selectionAvailable({ ...garment, isActive: false }, config, 'WASH_AND_FOLD', 'NONE'), false);
  });
});

test('T06 configuration writes and repeatable migration', async t => {
  const { request } = await contentTestHarness(t);
  const config = await PlatformConfig.create({ gstPercentage: 0 });
  await t.test('admin edits fees, labels and options and public reads return those values', async () => {
    const body = { deliveryFee: 0, freeDeliveryThreshold: 0, gstPercentage: 0, serviceTypes: [{ code: 'WASH_AND_FOLD', name: 'Gentle wash', shortName: 'Wash', isActive: true }], detergentOptions: [{ code: 'custom', name: 'Sensitive', extraPricePerOrder: 12.75 }], homeCareOptions: [] };
    assert.equal((await request('/config/settings', { method: 'PUT', role: 'admin', body })).status, 200);
    const current = (await request('/config/public')).body.config;
    assert.equal(current.deliveryFee, 0);
    assert.equal(current.serviceTypes[0].name, 'Gentle wash');
    assert.equal(current.detergentOptions[0].extraPricePerOrder, 12.75);
    assert.deepEqual(current.homeCareOptions, []);
    assert.equal((await request('/config/settings', { method: 'PUT', role: 'customer', body })).status, 403);
  });
  await t.test('duplicate identifiers, unsupported codes, wrong price bindings and negative fees fail', async () => {
    for (const body of [
      { detergentOptions: [{ code: 'X', name: 'One' }, { code: 'X', name: 'Two' }] },
      { serviceTypes: [{ code: 'UNKNOWN', name: 'Unknown' }] },
      { ironingTiers: [{ code: 'STANDARD_STEAM', name: 'Steam', priceKey: 'dryClean' }] },
      { detergentOptions: [{ code: 'X', name: 'One', extraPricePerOrder: -5 }] },
      { homeCareOptions: [{ id: 'bad', label: 'Bad', service: 'DRY_CLEAN', ironing: 'STANDARD_STEAM' }] },
    ]) assert.equal((await request('/config/settings', { method: 'PUT', role: 'admin', body })).status, 400);
    assert.equal((await PlatformConfig.findById(config._id)).serviceTypes[0].name, 'Gentle wash');
  });
  await t.test('empty choices and inactive slots stay empty with no read-time reseeding', async () => {
    await request('/config/settings', { method: 'PUT', role: 'admin', body: { serviceTypes: [], ironingTiers: [], detergentOptions: [], packagingOptions: [] } });
    await TimeSlot.create({ label: 'Test slot', startHour: 8, endHour: 9, isActive: false });
    const response = await request('/config/public');
    assert.deepEqual(response.body.slots, []);
    for (const key of ['serviceTypes', 'ironingTiers', 'detergentOptions', 'packagingOptions']) assert.deepEqual(response.body.config[key], []);
    assert.equal(await TimeSlot.countDocuments(), 1);
  });
  await t.test('migration fills only absent fields and preserves intentional empty choices', async () => {
    await PlatformConfig.collection.updateOne({ _id: config._id }, { $set: { serviceTypes: [{ code: 'WASH_AND_FOLD', name: 'Merchant label', isActive: false }], ironingTiers: [{ code: 'STANDARD_STEAM', name: 'Steam', shortName: '', priceKey: 'standardSteamIron' }] } });
    assert.equal((await optionsMigration()).changed, 1);
    await optionsMigration({ apply: true });
    const current = await PlatformConfig.findById(config._id);
    assert.equal(current.serviceTypes[0].shortName, 'Wash & Fold');
    assert.equal(current.serviceTypes[0].name, 'Merchant label');
    assert.equal(current.serviceTypes[0].isActive, false);
    assert.equal(current.ironingTiers[0].shortName, '');
    assert.equal(current.homeCareOptions.length, 0);
    assert.equal((await optionsMigration({ apply: true })).changed, 0);
    await PlatformConfig.deleteMany();
    assert.equal((await request('/config/public')).status, 503);
    assert.equal(await PlatformConfig.countDocuments(), 0);
  });
});
