import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customTemplate, activeOptions, validPreferences, scheduleAllowed } from '../../shared/bookingChoices.mjs';
import { availableServices, preferredFinish, selectionAvailable } from '../../shared/pricing.mjs';
import PlatformConfig from '../models/PlatformConfig.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import MediaAsset from '../models/MediaAsset.js';
import SiteContent from '../models/SiteContent.js';
import { contentMigration } from '../services/contentMigration.js';
import { bindContentText } from '../../shared/contentSchema.mjs';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('T10 Book sources, custom template and empty availability', async t => {
  const { request } = await contentTestHarness(t);
  const config = await PlatformConfig.create({ gstPercentage: 0 });
  const men = await Category.create({ name: 'Men' });
  const other = await Category.create({ name: 'Custom category' });
  const photo = await MediaAsset.create({ name: 'Test garment photo', provider: 'local', url: '/images/laundry/shirt-after-480.webp' });
  const shirt = await Garment.create({ name: 'Shirt', category: men.name, categoryId: men._id, pricing: testPrices, primaryImage: { assetId: photo._id } });
  const template = await Garment.create({ name: 'Custom', category: other.name, categoryId: other._id, pricing: testPrices, isCustom: true, allowedServices: ['DRY_CLEAN'], allowedIroningTiers: [] });
  await t.test('Book copy is publishable, complete and repeated migrations preserve edits', async () => {
    await contentMigration({ apply: true });
    const book = (await request('/admin/content/book', { role: 'admin' })).body.page;
    assert.ok(book.sections[0].content.entries.length > 150);
    const heading = book.sections[0].content.entries.find(entry => entry.value === 'Select Clothes');
    heading.value = 'Choose garments';
    assert.equal((await request('/admin/content/book', { method: 'PUT', role: 'admin', body: book })).status, 200);
    await contentMigration({ apply: true });
    const saved = (await request('/content/book')).body.page;
    assert.equal(saved.sections[0].content.entries.find(entry => entry.id === heading.id).value, 'Choose garments');
    const gst = saved.sections[0].content.entries.find(entry => entry.id === 'gst_5_sgst_cgst_29812e7');
    assert.equal(bindContentText(gst.value, config), 'GST (0% SGST + CGST):');
  });
  await t.test('custom template comes from the full catalog, independent of category and search', async () => {
    const bootstrap = (await request('/config/public')).body;
    const filtered = (await request(`/catalog/garments?categoryId=${men._id}&search=Shirt`)).body.data;
    assert.equal(customTemplate(filtered), null);
    assert.equal(customTemplate(bootstrap.garments)._id, String(template._id));
    assert.equal(availableServices(customTemplate(bootstrap.garments), config)[0].code, 'DRY_CLEAN');
    assert.equal(preferredFinish(customTemplate(bootstrap.garments), config, 'DRY_CLEAN', 'STANDARD_STEAM'), 'NONE');
    assert.equal(selectionAvailable(customTemplate(bootstrap.garments), config, 'DRY_CLEAN', 'NONE'), true);
    await Garment.updateOne({ _id: template._id }, { isActive: false });
    assert.equal(customTemplate((await request('/config/public')).body.garments), null);
  });
  await t.test('Book card/bag share the current photo reference and respect explicit removal', async () => {
    await MediaAsset.updateOne({ _id: photo._id }, { url: '/images/laundry/scene-after.webp', version: 2 });
    let product = (await request('/config/public')).body.garments.find(item => item._id === String(shirt._id));
    assert.equal(product.primaryImage.asset.version, 2);
    await request(`/catalog/garments/${shirt._id}`, { method: 'PUT', role: 'admin', body: { primaryImage: null } });
    product = (await request('/catalog/garments')).body.data.find(item => item._id === String(shirt._id));
    assert.equal(product.primaryImage, null);
    assert.equal(product.imageUrl, '');
  });
  await t.test('empty preferences and slots remain unavailable; configured ordering and turnaround are honored', () => {
    assert.deepEqual(activeOptions([]), []);
    assert.deepEqual(activeOptions([{ code: 'disabled', isActive: false }]), []);
    assert.deepEqual(activeOptions([{ code: 'B', sortOrder: 2 }, { code: 'A', sortOrder: 1 }]).map(item => item.code), ['A', 'B']);
    assert.equal(validPreferences({ detergentType: 'Standard', packagingType: 'Folded' }, { detergentOptions: [], packagingOptions: [] }), false);
    const pickup = { date: '2030-01-01', timeSlot: 'Morning' };
    const delivery = { date: '2030-01-02', timeSlot: 'Morning' };
    const slots = [{ label: 'Morning', startHour: 8, endHour: 10, isActive: true }];
    assert.equal(scheduleAllowed(pickup, delivery, [], config, false), false);
    assert.equal(scheduleAllowed(pickup, delivery, slots, config, false), false);
    assert.equal(scheduleAllowed(pickup, { ...delivery, date: '2030-01-03' }, slots, config, false), true);
    assert.equal(scheduleAllowed(pickup, { ...delivery, date: '2030-01-03' }, slots, { ...config.toObject(), minStandardTurnaroundHours: 72 }, false), false);
  });
});
