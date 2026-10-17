import { test } from 'node:test';
import assert from 'node:assert/strict';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { CONTENT_SCHEMAS, SEO_SCHEMA, blankContentValue, bindContentText } from '../../shared/contentSchema.mjs';
import { contentTestHarness } from './contentTestHarness.mjs';

test('T08 structured pages, atomic publication and media references', async t => {
  const { request } = await contentTestHarness(t);
  await PlatformConfig.create({ minStandardTurnaroundHours: 24 });
  const asset = await MediaAsset.create({ name: 'Hero test', provider: 'local', url: '/images/laundry/scene-after.webp' });
  const page = { pageKey: 'home', revision: 0, schemaVersion: 1, seo: blankContentValue(SEO_SCHEMA), sections: [{ key: 'hero', type: 'hero', isVisible: true, sortOrder: 0, content: { ...blankContentValue(CONTENT_SCHEMAS.hero), turnaroundHours: 48, plain: 'Laundry,', accent: 'Sorted.', actionHref: '/book', afterImage: { assetId: String(asset._id), decorative: true } } }] };
  const save = body => request('/admin/content/home', { method: 'PUT', role: 'admin', body });
  await t.test('public reads do not seed; admin creates and reads a published revision', async () => {
    assert.equal((await request('/content/home')).body.page, null);
    assert.equal(await SiteContent.countDocuments(), 0);
    const saved = await save(page);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.page.revision, 1);
    const publicPage = (await request('/content/home')).body.page;
    assert.equal(publicPage.sections[0].content.plain, 'Laundry,');
    assert.equal(publicPage.sections[0].content.afterImage.asset.url, asset.url);
    assert.equal(publicPage.mediaAssetIds, undefined);
  });
  await t.test('unauthorized writes and private reads are rejected', async () => {
    assert.equal((await request('/admin/content/home')).status, 401);
    assert.equal((await request('/admin/content/home', { role: 'customer' })).status, 403);
    assert.equal((await request('/admin/content/home', { method: 'PUT', role: 'customer', body: page })).status, 403);
    assert.equal((await request('/content/unknown')).status, 404);
  });
  await t.test('concurrent saves publish exactly one new complete revision', async () => {
    const original = structuredClone(page); original.revision = 1;
    const another = structuredClone(original); another.sections[0].content.plain = 'Alternate';
    const results = await Promise.all([save(original), save(another)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal((await SiteContent.findOne()).revision, 2);
    assert.equal((await save(page)).status, 409);
  });
  await t.test('invalid shapes, scripts in links, foreign fields, duplicate keys and unavailable media cannot publish', async () => {
    const bad = patch => { const copy = structuredClone(page); copy.revision = 2; patch(copy); return copy; };
    const cases = [
      bad(copy => copy.sections[0].content.actionHref = 'javascript:alert(1)'),
      bad(copy => copy.sections[0].content.actionHref = '//example.test'),
      bad(copy => copy.sections[0].content.actionHref = '/admin'),
      bad(copy => copy.sections[0].content.css = 'display:none'),
      bad(copy => copy.sections[0].content.price = 1),
      bad(copy => copy.sections.push(structuredClone(copy.sections[0]))),
      bad(copy => copy.sections[0].content.pickupText = '{{config.paymentSecret}}'),
      bad(copy => copy.sections[0].content.turnaroundHours = 2),
      bad(copy => copy.sections[0].content.afterImage.assetId = '123456789012345678901234'),
      bad(copy => copy.sections[0].type = 'rawHtml'),
    ];
    for (const candidate of cases) assert.equal((await save(candidate)).status, 400);
    assert.equal((await SiteContent.findOne()).revision, 2);
  });
  await t.test('shared media replacement is resolved immediately; referenced assets cannot be archived', async () => {
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
    await MediaAsset.updateOne({ _id: asset._id }, { url: '/images/laundry/scene-before.webp', version: 2 });
    const image = (await request('/content/home')).body.page.sections[0].content.afterImage.asset;
    assert.equal(image.version, 2);
    assert.equal(image.url, '/images/laundry/scene-before.webp');
    const hidden = structuredClone(page); hidden.revision = 2; hidden.sections[0].isVisible = false;
    assert.equal((await save(hidden)).status, 200);
    assert.deepEqual((await request('/content/home')).body.page.sections, []);
    assert.equal((await request('/admin/content/home', { role: 'admin' })).body.page.sections.length, 1);
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
  });
  await t.test('clearing image and list fields stays cleared; bindings honor zero and hidden rows stay private', async () => {
    const cleared = structuredClone(page); cleared.revision = 3; cleared.sections[0].content.afterImage = null;
    cleared.sections.push({ key: 'testimonials', type: 'testimonials', isVisible: true, sortOrder: 2, content: { ...blankContentValue(CONTENT_SCHEMAS.testimonials), items: [{ id: 'quote', name: 'Test', role: '', comment: 'Free delivery above ₹399', rating: 5, avatar: null, isVisible: false, sortOrder: 0 }] } });
    const response = await save(cleared);
    assert.equal(response.status, 200);
    assert.equal(response.body.warnings.length, 1);
    assert.equal((await request('/content/home')).body.page.sections[0].content.afterImage, null);
    assert.deepEqual((await request('/content/home')).body.page.sections[1].content.items, []);
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 200);
    assert.equal(bindContentText('GST {{config.gstPercentage}}%; free at ₹{{config.freeDeliveryThreshold}}', { gstPercentage: 0, freeDeliveryThreshold: 0 }), 'GST 0%; free at ₹0');
  });
});
