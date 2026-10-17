import { test } from 'node:test';
import assert from 'node:assert/strict';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import { productMigration } from '../services/productMigration.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('T04 product editing preserves and exposes the complete product record', async t => {
  const { request } = await contentTestHarness(t);
  const category = await Category.create({ name: 'Men' });
  let id;
  await t.test('create stores descriptive fields, order and supported services', async () => {
    const response = await request('/catalog/garments', { method: 'POST', role: 'admin', body: {
      name: 'Formal shirt', shortName: 'Shirt', description: 'Cotton care', sortOrder: 2,
      categoryId: category._id, pricing: testPrices, allowedServices: ['WASH_AND_FOLD'], allowedIroningTiers: [],
    } });
    assert.equal(response.status, 201);
    id = response.body.data._id;
    const record = (await request('/catalog/garments')).body.data[0];
    assert.equal(record.shortName, 'Shirt');
    assert.equal(record.description, 'Cotton care');
    assert.equal(record.sortOrder, 2);
    assert.deepEqual(record.allowedServices, ['WASH_AND_FOLD']);
    assert.deepEqual(record.allowedIroningTiers, []);
  });
  await t.test('partial rate and photo changes preserve unrelated fields', async () => {
    const updated = await request(`/catalog/garments/${id}`, { method: 'PUT', role: 'admin', body: { pricing: { washOnly: 44 }, imageUrl: 'https://example.test/shirt.webp', sortOrder: -1 } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.pricing.washOnly, 44);
    assert.equal(updated.body.data.pricing.dryClean, 90);
    assert.equal(updated.body.data.description, 'Cotton care');
    assert.equal(updated.body.data.imageUrl, 'https://example.test/shirt.webp');
    const cleared = await request(`/catalog/garments/${id}`, { method: 'PUT', role: 'admin', body: { shortName: '', description: '', imageUrl: '' } });
    assert.equal(cleared.body.data.shortName, '');
    assert.equal(cleared.body.data.description, '');
    assert.equal(cleared.body.data.imageUrl, '');
  });
  await t.test('invalid product fields fail without changing stored prices', async () => {
    for (const body of [{ allowedServices: ['UNKNOWN'] }, { allowedIroningTiers: ['UNKNOWN'] }, { sortOrder: 1.5 }, { pricing: { washOnly: -1 } }]) {
      assert.equal((await request(`/catalog/garments/${id}`, { method: 'PUT', role: 'admin', body })).status, 400);
    }
    assert.equal((await Garment.findById(id)).pricing.washOnly, 44);
  });
  await t.test('migration fills missing legacy labels once and respects intentional empty fields', async () => {
    const legacy = await Garment.collection.insertOne({ name: 'Men T-Shirt / Polo', category: 'Men', categoryId: category._id, pricing: testPrices, isActive: true });
    assert.equal((await productMigration()).changed, 1);
    await productMigration({ apply: true });
    assert.equal((await Garment.findById(legacy.insertedId)).shortName, 'T-Shirt');
    assert.equal((await Garment.findById(id)).shortName, '');
    assert.equal((await productMigration({ apply: true })).changed, 0);
    assert.equal((await request('/catalog/garments')).body.data[0]._id, id);
  });
});
