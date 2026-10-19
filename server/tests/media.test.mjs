import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudinary, ensureCloudinaryConfigured } from '../utils/cloudinary.js';
import MediaAsset from '../models/MediaAsset.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import { mediaMigration } from '../services/mediaMigration.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
test('T05 media replacement, removal, failure and permissions', async t => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-only';
  process.env.CLOUDINARY_API_KEY = 'test-only';
  process.env.CLOUDINARY_API_SECRET = 'test-only';
  const original = cloudinary.uploader.upload;
  let uploads = 0, fail = false, unauthorized = false;
  cloudinary.uploader.upload = async (input, options) => {
    assert.equal(options.format, 'webp');
    assert.deepEqual(options.transformation, [{ width: 2400, height: 2400, crop: 'limit' }, { quality: 'auto:good' }]);
    uploads++;
    if (fail) throw new Error('Simulated storage outage');
    if (unauthorized) throw Object.assign(new Error('Invalid cloud_name private-value'), { http_code: 401 });
    return { secure_url: `https://example.test/image-${uploads}.webp`, public_id: `test-${uploads}`, width: 1, height: 1, format: 'webp', bytes: 42 };
  };
  t.after(() => { cloudinary.uploader.upload = original; });
  const { request } = await contentTestHarness(t);
  const category = await Category.create({ name: 'Home' });
  let asset, first, second;
  await t.test('verified upload creates a reusable image record', async () => {
    const response = await request('/media', { method: 'POST', role: 'admin', body: { name: 'Towel photo', imageBase64: png } });
    assert.equal(response.status, 201);
    asset = response.body.data;
    assert.equal(asset.provider, 'cloudinary');
    assert.equal(asset.width, 1);
    assert.equal(asset.mimeType, 'image/webp');
    assert.equal(asset.bytes, 42);
    assert.match(asset.url, /\.webp$/);
    assert.equal(asset.version, 1);
    for (const name of ['Towel', 'Matching towel']) {
      const response = await request('/catalog/garments', { method: 'POST', role: 'admin', body: { name, categoryId: category._id, pricing: testPrices, primaryImage: { assetId: asset._id } } });
      assert.equal(response.status, 201);
      if (!first) first = response.body.data; else second = response.body.data;
    }
  });
  await t.test('invalid files do not create records or reach storage', async () => {
    const before = uploads;
    for (const imageBase64 of ['data:image/svg+xml;base64,PHN2Zz4=', 'https://example.test/file.png', 'data:image/png;base64,bm90YW5pbWFnZQ==']) {
      assert.equal((await request('/media', { method: 'POST', role: 'admin', body: { name: 'Invalid', imageBase64 } })).status, 400);
    }
    assert.equal(uploads, before);
    assert.equal(await MediaAsset.countDocuments(), 1);
  });
  await t.test('replacing an image changes all current linked catalog images', async () => {
    const response = await request(`/media/${asset._id}`, { method: 'PUT', role: 'admin', body: { version: asset.version, imageBase64: png } });
    assert.equal(response.status, 200);
    asset = response.body.data;
    const catalog = await request('/catalog/garments');
    assert.ok(catalog.body.data.every(g => g.imageUrl === asset.url));
    assert.equal(asset.version, 2);
    assert.equal(asset.mimeType, 'image/webp');
    assert.equal(asset.bytes, 42);
    assert.equal(asset.history.length, 1);
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
  });
  await t.test('failed and stale replacements keep the previous image', async () => {
    fail = true;
    assert.equal((await request(`/media/${asset._id}`, { method: 'PUT', role: 'admin', body: { version: 2, imageBase64: png } })).status, 503);
    fail = false;
    const before = uploads;
    assert.equal((await request(`/media/${asset._id}`, { method: 'PUT', role: 'admin', body: { version: 1, imageBase64: png } })).status, 409);
    assert.equal(uploads, before);
    assert.equal((await MediaAsset.findById(asset._id)).url, asset.url);
    assert.equal((await MediaAsset.findById(asset._id)).version, 2);
  });
  await t.test('rejected storage credentials give a clear error without leaking configuration or changing images', async () => {
    unauthorized = true;
    const response = await request(`/media/${asset._id}`, { method: 'PUT', role: 'admin', body: { version: asset.version, imageBase64: png } });
    unauthorized = false;
    assert.equal(response.status, 503);
    assert.match(response.body.message, /Update the Cloudinary configuration/);
    assert.ok(!response.body.message.includes('private-value'));
    assert.equal((await MediaAsset.findById(asset._id)).url, asset.url);
  });
  await t.test('clearing one placement does not affect another; gallery references prevent archive', async () => {
    const response = await request(`/catalog/garments/${first._id}`, { method: 'PUT', role: 'admin', body: { primaryImage: null, gallery: [{ assetId: asset._id }] } });
    assert.equal(response.body.data.primaryImage, null);
    assert.equal(response.body.data.imageUrl, '');
    assert.equal(response.body.data.gallery[0].asset.url, asset.url);
    await request(`/catalog/garments/${second._id}`, { method: 'PUT', role: 'admin', body: { primaryImage: null } });
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
    await request(`/catalog/garments/${first._id}`, { method: 'PUT', role: 'admin', body: { gallery: [] } });
    assert.equal((await request(`/media/${asset._id}`, { method: 'DELETE', role: 'admin' })).status, 200);
    assert.equal((await request('/media', { role: 'admin' })).body.data.length, 0);
    assert.equal((await request(`/media/${asset._id}/restore`, { method: 'POST', role: 'admin' })).status, 200);
  });
  await t.test('legacy imagery migrates to separate managed assets and removed images stay removed', async () => {
    const records = await Garment.collection.insertMany([
      { name: 'Bath towel', category: 'Home', categoryId: category._id, pricing: testPrices, isActive: true },
      { name: 'Double bedsheet', category: 'Home', categoryId: category._id, pricing: testPrices, isActive: true },
    ]);
    assert.equal((await mediaMigration()).changed, 2);
    await mediaMigration({ apply: true });
    const towel = await Garment.findById(records.insertedIds[0]);
    const sheet = await Garment.findById(records.insertedIds[1]);
    assert.notEqual(String(towel.primaryImage.assetId), String(sheet.primaryImage.assetId));
    await Garment.updateOne({ _id: towel._id }, { primaryImage: null });
    assert.equal((await mediaMigration({ apply: true })).changed, 0);
    assert.equal((await Garment.findById(towel._id)).primaryImage, null);
  });
  await t.test('library and upload actions reject non-admin users', async () => {
    assert.equal((await request('/media')).status, 401);
    assert.equal((await request('/media', { role: 'customer' })).status, 403);
    assert.equal((await request('/media', { method: 'POST', role: 'customer', body: { imageBase64: png } })).status, 403);
  });
});


test('T15 URL-only storage configuration is parsed explicitly and invalid URLs fail closed', () => {
  const oldUrl = process.env.CLOUDINARY_URL;
  try {
    process.env.CLOUDINARY_URL = 'cloudinary://fixture-key:fixture%2Dsecret@fixture-cloud';
    assert.equal(ensureCloudinaryConfigured(), true);
    assert.equal(cloudinary.config().cloud_name, 'fixture-cloud');
    assert.equal(cloudinary.config().api_secret, 'fixture-secret');
    process.env.CLOUDINARY_URL = 'https://invalid.example.test';
    assert.equal(ensureCloudinaryConfigured(), false);
  } finally { if (oldUrl === undefined) delete process.env.CLOUDINARY_URL; else process.env.CLOUDINARY_URL = oldUrl; }
});
