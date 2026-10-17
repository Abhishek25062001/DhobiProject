import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import { migrateWebsite, migrationSnapshot, snapshotHash, rollbackWebsite } from '../services/websiteMigration.js';
import { seedData } from '../utils/seeder.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import PlatformConfig from '../models/PlatformConfig.js';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import ServiceArea from '../models/ServiceArea.js';
import Migration from '../models/Migration.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import TimeSlot from '../models/TimeSlot.js';
import Coupon from '../models/Coupon.js';

test('T14 consolidated migration, rollback and intentional empty state', async t => {
  const { request } = await contentTestHarness(t);
  const directory = await mkdtemp(path.join(tmpdir(), 'indodhobi-migration-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Category.create({ name: 'Men', slug: 'men', shortName: 'Gentlemen' });
  const id = new mongoose.Types.ObjectId();
  await Garment.collection.insertOne({ _id: id, name: 'Men Shirt', category: 'Men', pricing: testPrices, isActive: true });
  await PlatformConfig.collection.insertOne({ businessName: 'Existing business', gstPercentage: 0, detergentOptions: [], serviceTypes: [], packagingOptions: [], ironingTiers: [] });
  const original = await migrationSnapshot();
  let applied;
  await t.test('dry run validates all steps without writing; apply preserves IDs, zeroes and empty lists', async () => {
    const plan = await migrateWebsite();
    assert.deepEqual(plan.errors, []); assert.equal(plan.steps.categories.changed, 1);
    assert.equal(snapshotHash(await migrationSnapshot()), snapshotHash(original));
    applied = await migrateWebsite({ apply: true, directory });
    assert.equal(applied.status, 'applied');
    const garment = await Garment.findById(id).lean();
    assert.equal(garment.shortName, 'Shirt'); assert.ok(garment.primaryImage.assetId);
    assert.equal((await Category.findOne()).shortName, 'Gentlemen');
    const config = await PlatformConfig.collection.findOne();
    assert.equal(config.gstPercentage, 0); assert.deepEqual(config.serviceTypes, []);
    assert.equal(await SiteContent.countDocuments(), 12);
    assert.equal((await ServiceArea.findOne()).timezone, 'Asia/Kolkata');
    assert.match(await readFile(applied.backup, 'utf8'), /\$oid/);
  });
  await t.test('rollback restores original BSON IDs, timestamps, missing fields and collections exactly', async () => {
    assert.equal((await rollbackWebsite(applied.backup)).ready, true);
    assert.equal((await rollbackWebsite(applied.backup, { apply: true })).restored, true);
    assert.equal(snapshotHash(await migrationSnapshot()), snapshotHash(original));
    applied = await migrateWebsite({ apply: true, directory });
  });
  await t.test('repeat preserves edits, removed images, empty sections and deleted pages/hubs', async () => {
    await Garment.updateOne({ _id: id }, { shortName: 'Admin shirt', primaryImage: null, allowedServices: [] });
    await SiteContent.updateOne({ pageKey: 'home' }, { sections: [] });
    await SiteContent.deleteOne({ pageKey: 'book' });
    await ServiceArea.deleteMany({});
    const edited = await migrationSnapshot();
    const repeat = await migrateWebsite({ apply: true, directory });
    assert.ok(Object.values(repeat.steps).every(step => step.changed === 0));
    assert.equal(snapshotHash(await migrationSnapshot()), snapshotHash(edited));
    await assert.rejects(rollbackWebsite(applied.backup, { apply: true }), /content changed/);
    await request('/config/public'); await request('/content/book'); await request('/service-areas');
    assert.equal(snapshotHash(await migrationSnapshot()), snapshotHash(edited));
  });
  await t.test('unmapped category preflight blocks every write', async () => {
    const unknown = await Garment.collection.insertOne({ name: 'Unknown', category: 'Unmapped', pricing: testPrices });
    const before = snapshotHash(await migrationSnapshot());
    assert.ok((await migrateWebsite()).errors.some(error => /Unmapped/.test(error.message)));
    await assert.rejects(migrateWebsite({ apply: true, directory }), /preflight failed/);
    assert.equal(snapshotHash(await migrationSnapshot()), before);
    await Garment.deleteOne({ _id: unknown.insertedId });
  });
  await t.test('a failed run leaves a verifiable recovery journal and releases its lock', async () => {
    await Migration.deleteOne({ _id: 'website-content-v1' });
    const before = snapshotHash(await migrationSnapshot());
    let backup;
    try { await migrateWebsite({ apply: true, directory, afterStep: name => { if (name === 'content') throw new Error('Controlled failure'); } }); }
    catch (error) { backup = error.backup; }
    assert.ok(backup);
    await rollbackWebsite(backup, { apply: true });
    assert.equal(snapshotHash(await migrationSnapshot()), before);
  });
  await t.test('explicit initial seed excludes demo accounts/orders and never resurrects deleted defaults', async () => {
    for (const model of [Garment, Category, MediaAsset, PlatformConfig, SiteContent, ServiceArea, Migration, TimeSlot, Coupon]) await model.deleteMany({});
    const users = await User.countDocuments();
    await seedData();
    assert.equal(await User.countDocuments(), users); assert.equal(await Order.countDocuments(), 0);
    await migrateWebsite({ apply: true, directory });
    assert.equal((await PlatformConfig.findOne()).supportEmail, 'care@indodhobi.com');
    await Garment.deleteMany({}); await TimeSlot.deleteMany({}); await Coupon.deleteMany({});
    assert.equal((await seedData()).changed, 0);
    assert.equal(await Garment.countDocuments(), 0); assert.equal(await TimeSlot.countDocuments(), 0); assert.equal(await Coupon.countDocuments(), 0);
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /seedData/);
  });
});
