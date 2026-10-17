import { test } from 'node:test';
import assert from 'node:assert/strict';
import Garment from '../server/models/Garment.js';
import Order from '../server/models/Order.js';
import PlatformConfig from '../server/models/PlatformConfig.js';
import { requireCatalog } from '../client/src/services/readWithRetry.js';

// Explicit legacy fixtures protect the wire/storage format during later migrations.
// These tests validate real Mongoose documents without connecting to a database.
const prices = { washOnly: 35, standardSteamIron: 15, crispStarchPress: 20, delicatePress: 25, dryClean: 90 };
const garment = overrides => new Garment({ name: 'Contract test shirt', category: 'Men', pricing: prices, ...overrides });
const payload = doc => ({ success: true, data: [JSON.parse(JSON.stringify(doc))] });
const item = overrides => ({
  garment: '000000000000000000000001', garmentName: 'Contract test shirt', category: 'Men',
  quantity: 1, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE', unitPrice: 35, lineTotal: 35,
  ...overrides,
});
function itemErrors(overrides) {
  const error = new Order({ items: [item(overrides)] }).validateSync();
  return Object.fromEntries(Object.entries(error?.errors || {}).filter(([path]) => path.startsWith('items.')));
}

test('existing stored garment prices serialize to a catalog the website accepts', () => {
  const doc = garment();
  assert.equal(doc.validateSync(), undefined);
  const response = requireCatalog(payload(doc));
  assert.deepEqual(response.data[0].pricing, prices);
});

test('zero remains a valid rate and does not imply an unavailable product', () => {
  const doc = garment({ pricing: { washOnly: 0, standardSteamIron: 0, crispStarchPress: 0, delicatePress: 0, dryClean: 0 } });
  assert.equal(doc.validateSync(), undefined);
  assert.equal(requireCatalog(payload(doc)).data[0].isActive, true);
  assert.equal(requireCatalog(payload(doc)).data[0].pricing.washOnly, 0);
});

test('missing or negative rates are rejected on both sides of the catalog boundary', () => {
  for (const key of Object.keys(prices)) {
    for (const value of [undefined, -1]) {
      const doc = garment({ pricing: { ...prices, [key]: value } });
      assert.ok(doc.validateSync()?.errors[`pricing.${key}`], `${key} must be valid in storage`);
      assert.throws(() => requireCatalog(payload(doc)), /catalog could not/);
    }
  }
});

test('legacy order selections still validate after sharing the storage identifiers', () => {
  const selections = [
    ['WASH_AND_FOLD', 'NONE'], ['DRY_CLEAN', 'NONE'],
    ['WASH_AND_IRON', 'STANDARD_STEAM'], ['WASH_AND_IRON', 'CRISP_STARCH'], ['WASH_AND_IRON', 'DELICATE_PRESS'],
    ['IRON_ONLY', 'STANDARD_STEAM'], ['IRON_ONLY', 'CRISP_STARCH'], ['IRON_ONLY', 'DELICATE_PRESS'],
  ];
  for (const [serviceType, ironingType] of selections) {
    assert.deepEqual(itemErrors({ serviceType, ironingType }), {}, `${serviceType}/${ironingType}`);
  }
});

test('display names and unknown selections cannot replace stored service identifiers', () => {
  for (const serviceType of ['Wash & Fold', 'NEW_SERVICE']) {
    assert.equal(itemErrors({ serviceType })['items.0.serviceType']?.kind, 'enum');
  }
  for (const ironingType of ['Steam', 'NEW_FINISH']) {
    assert.equal(itemErrors({ ironingType })['items.0.ironingType']?.kind, 'enum');
  }
});

test('default configured service codes remain compatible when display names change', () => {
  const config = new PlatformConfig();
  for (const service of config.serviceTypes) {
    service.name = `Renamed ${service.code}`;
    assert.deepEqual(itemErrors({ serviceType: service.code }), {});
  }
  for (const tier of config.ironingTiers) {
    tier.name = `Renamed ${tier.code}`;
    assert.deepEqual(itemErrors({ serviceType: 'IRON_ONLY', ironingType: tier.code }), {});
    assert.ok(Object.hasOwn(prices, tier.priceKey), `${tier.code} must reference a stored garment rate`);
  }
  assert.equal(config.validateSync(), undefined);
});
