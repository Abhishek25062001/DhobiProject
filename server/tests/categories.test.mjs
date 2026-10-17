import { test } from 'node:test';
import assert from 'node:assert/strict';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import { categoryMigration } from '../services/categoryMigration.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('T03 categories retain product identity across migration, rename, reorder and archive', async t => {
  const { request } = await contentTestHarness(t);
  const household = await Category.create({ name: 'Household & Bedding', slug: 'household-bedding', sortOrder: 4 });
  const legacy = await Garment.create({ name: 'Towel', category: 'Household', pricing: testPrices });

  await t.test('dry run is read-only and applying twice preserves IDs', async () => {
    assert.equal((await categoryMigration()).linked, 1);
    assert.equal((await Garment.findById(legacy._id)).categoryId, undefined);
    await categoryMigration({ apply: true });
    assert.equal((await categoryMigration({ apply: true })).linked, 0);
    assert.equal(String((await Garment.findById(legacy._id)).categoryId), String(household._id));
    assert.equal((await Category.findById(household._id)).shortName, 'Home');
    await Category.updateOne({ _id: household._id }, { shortName: '' });
    await categoryMigration({ apply: true });
    assert.equal((await Category.findById(household._id)).shortName, '');
  });
  let kids;
  await t.test('admin can add a category outside the old enum and create a product in it', async () => {
    const created = await request('/admin/categories', { method: 'POST', role: 'admin', body: { name: 'Kids', shortName: 'Kids', sortOrder: 1 } });
    assert.equal(created.status, 201);
    kids = created.body.data;
    const garment = await request('/catalog/garments', { method: 'POST', role: 'admin', body: { name: 'School uniform', categoryId: kids._id, pricing: testPrices } });
    assert.equal(garment.status, 201);
    assert.equal(String(garment.body.data.categoryId), kids._id);
    const filtered = await request(`/catalog/garments?category=${kids._id}`);
    assert.deepEqual(filtered.body.data.map(g => g.name), ['School uniform']);
  });
  await t.test('renaming uses the same category ID and slug, and existing products show the new name', async () => {
    const response = await request(`/admin/categories/${household._id}`, { method: 'PUT', role: 'admin', body: { name: 'Home linens', shortName: 'Linens', sortOrder: 0 } });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.slug, 'household-bedding');
    const catalog = await request('/catalog/garments');
    const towel = catalog.body.data.find(g => g._id === String(legacy._id));
    assert.equal(towel.category, 'Home linens');
    assert.equal(towel.categoryDetails.shortName, 'Linens');
    assert.equal((await request('/catalog/categories')).body.data[0]._id, String(household._id));
    assert.equal((await Garment.findById(legacy._id)).category, 'Household');
  });
  await t.test('archiving hides products publicly without deleting either record', async () => {
    assert.equal((await request(`/admin/categories/${household._id}`, { method: 'DELETE', role: 'admin' })).status, 200);
    assert.equal(await Category.countDocuments({ _id: household._id }), 1);
    assert.equal(await Garment.countDocuments({ _id: legacy._id }), 1);
    assert.equal((await request('/catalog/garments')).body.data.some(g => g._id === String(legacy._id)), false);
    assert.equal((await request('/catalog/garments?includeInactive=true', { role: 'admin' })).body.data.some(g => g._id === String(legacy._id)), true);
  });
  await t.test('inactive reads and category changes require an administrator', async () => {
    assert.equal((await request('/catalog/garments?includeInactive=true')).status, 401);
    assert.equal((await request('/catalog/garments?includeInactive=true', { role: 'customer' })).status, 403);
    assert.equal((await request(`/admin/categories/${kids._id}`, { method: 'PUT', body: { name: 'Forged' } })).status, 401);
  });
  await t.test('unknown categories fail without inserting a product and search is literal', async () => {
    const count = await Garment.countDocuments();
    assert.equal((await request('/catalog/garments', { method: 'POST', role: 'admin', body: { name: 'Unknown', categoryId: '000000000000000000000099', pricing: testPrices } })).status, 400);
    assert.equal(await Garment.countDocuments(), count);
    assert.equal((await request('/catalog/garments?search=%5B')).body.count, 0);
  });
});
