import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { contentMigration } from '../services/contentMigration.js';
import { HOME_MEDIA } from '../content/homeDefaults.js';
import { serviceFromPrice } from '../../shared/pricing.mjs';
import { bindContentText } from '../../shared/contentSchema.mjs';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('T09 homepage migration, editing and live promotional prices', async t => {
  const { request } = await contentTestHarness(t);
  const config = await PlatformConfig.create({ gstPercentage: 0 });
  const category = await Category.create({ name: 'Men' });
  const shirt = await Garment.create({ name: 'Shirt', category: category.name, categoryId: category._id, pricing: testPrices });
  await Garment.create({ name: 'Custom quote', category: category.name, categoryId: category._id, pricing: { ...testPrices, washOnly: 0 }, isCustom: true });
  let home;
  await t.test('dry run is read-only; migration creates exact initial content and all existing artwork', async () => {
    assert.deepEqual((await contentMigration()).pending, ['home', 'global', 'book', 'pricing', 'privacy', 'terms', 'areas', 'login', 'register', 'profile', 'orders', 'order-success']);
    assert.equal(await SiteContent.countDocuments(), 0);
    assert.equal(await MediaAsset.countDocuments(), 0);
    for (const media of Object.values(HOME_MEDIA)) await access(new URL(`../../client/public${media.url}`, import.meta.url));
    await contentMigration({ apply: true });
    home = (await request('/admin/content/home', { role: 'admin' })).body.page;
    const publicPage = (await request('/content/home')).body.page;
    assert.equal(publicPage.sections.find(section => section.key === 'hero').content.plain, 'Laundry,');
    assert.equal(publicPage.sections.find(section => section.key === 'hero').content.afterImage.asset.url, '/images/laundry/scene-after.webp');
    assert.equal(publicPage.sections.find(section => section.key === 'journey').content.stages.length, 4);
    assert.equal(publicPage.sections.find(section => section.key === 'services').content.items.length, 4);
    assert.equal(await MediaAsset.countDocuments(), 12);
    assert.equal((await contentMigration({ apply: true })).changed, 0);
  });
  await t.test('admin can change every home section and clear imagery without changing source files', async () => {
    for (const section of home.sections) {
      if ('plain' in section.content) section.content.plain = `Edited ${section.key}`;
    }
    home.sections.find(section => section.key === 'hero').content.beforeImage = null;
    home.sections.find(section => section.key === 'journey').content.stages[0].title = 'Choose a pickup';
    home.sections.find(section => section.key === 'services').content.items[0].description = 'Updated wash description';
    home.sections.find(section => section.key === 'comparison').content.items[0].own = 'Updated care comparison';
    home.sections.find(section => section.key === 'testimonials').content.items[0].comment = 'Updated customer quotation';
    assert.equal((await request('/admin/content/home', { method: 'PUT', role: 'admin', body: home })).status, 200);
    const published = (await request('/content/home')).body.page;
    for (const section of published.sections) if ('plain' in section.content) assert.equal(section.content.plain, `Edited ${section.key}`);
    assert.equal(published.sections.find(section => section.key === 'hero').content.beforeImage, null);
    assert.equal(bindContentText('Back in {{home.turnaroundHours}} hours', config, { 'home.turnaroundHours': 48 }), 'Back in 48 hours');
  });
  await t.test('From pricing uses current eligible products, preserves zero and disappears when unavailable', async () => {
    let catalog = (await request('/catalog/garments')).body.data;
    assert.equal(serviceFromPrice(catalog, config, 'WASH_AND_FOLD', 'NONE'), 35);
    await Garment.updateOne({ _id: shirt._id }, { 'pricing.washOnly': 0 });
    catalog = (await request('/catalog/garments')).body.data;
    assert.equal(serviceFromPrice(catalog, config, 'WASH_AND_FOLD', 'NONE'), 0);
    assert.equal(serviceFromPrice(catalog, config, 'WASH_AND_IRON', 'STANDARD_STEAM'), 15);
    assert.equal(serviceFromPrice(catalog, { ...config.toObject(), serviceTypes: [] }, 'WASH_AND_FOLD', 'NONE'), null);
    await Category.updateOne({ _id: category._id }, { isActive: false });
    assert.equal(serviceFromPrice((await request('/catalog/garments')).body.data, config, 'WASH_AND_FOLD', 'NONE'), null);
  });
  await t.test('repeat migration never overwrites published edits or restores removed content', async () => {
    await SiteContent.updateOne({ pageKey: 'home' }, { sections: [], revision: 5 });
    assert.equal((await contentMigration({ apply: true })).changed, 0);
    assert.deepEqual((await SiteContent.findOne()).sections, []);
    assert.equal((await SiteContent.findOne()).revision, 5);
    assert.equal(await MediaAsset.countDocuments(), 12);
  });
});
