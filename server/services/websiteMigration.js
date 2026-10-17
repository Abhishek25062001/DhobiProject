import mongoose from 'mongoose';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import SiteContent from '../models/SiteContent.js';
import ServiceArea from '../models/ServiceArea.js';
import Migration from '../models/Migration.js';
import { categoryMigration } from './categoryMigration.js';
import { productMigration } from './productMigration.js';
import { mediaMigration } from './mediaMigration.js';
import { optionsMigration } from './optionsMigration.js';
import { contentMigration } from './contentMigration.js';
import { serviceAreaMigration } from './serviceAreaMigration.js';

const models = [Category, Garment, MediaAsset, PlatformConfig, SiteContent, ServiceArea, Migration];
const steps = { categories: categoryMigration, products: productMigration, media: mediaMigration, options: optionsMigration, content: contentMigration, serviceAreas: serviceAreaMigration };
const EJSON = mongoose.mongo.BSON.EJSON;
const lockId = 'website-migration-lock';
export async function migrationSnapshot() {
  return Object.fromEntries(await Promise.all(models.map(async model => [model.collection.name,
    await model.collection.find(model === Migration ? { _id: { $ne: lockId } } : {}).sort({ _id: 1 }).toArray()])));
}
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
export const snapshotHash = value => createHash('sha256').update(JSON.stringify(ordered(EJSON.serialize(value)))).digest('hex');
async function saveJournal(path, value) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, EJSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, path);
}
async function withLock(work) {
  try { await Migration.create({ _id: lockId }); }
  catch (error) { if (error.code === 11000) throw new Error('Another migration is active, or a previous run was interrupted. Inspect its journal before clearing the migration lock.'); throw error; }
  try { return await work(); } finally { await Migration.deleteOne({ _id: lockId }); }
}
async function followup({ apply = false } = {}) {
  const areas = await ServiceArea.collection.find({ timezone: { $exists: false } }).toArray();
  const global = await SiteContent.collection.findOne({ pageKey: 'global' });
  const sectionIndex = global?.sections?.findIndex(section => section.key === 'copy');
  const entries = global?.sections?.[sectionIndex]?.content?.entries || [];
  const copyIndex = entries.findIndex(entry => entry.id === 'indodhobi_technologies_pvt_ltd_all_rights_reserved_4e96ad9' && entry.value === ' {{config.businessName}}. All rights reserved.');
  if (apply) {
    await ServiceArea.collection.updateMany({ timezone: { $exists: false } }, { $set: { timezone: 'Asia/Kolkata' } });
    if (copyIndex >= 0) await SiteContent.collection.updateOne({ _id: global._id, revision: global.revision }, { $set: { [`sections.${sectionIndex}.content.entries.${copyIndex}.value`]: ' {{config.businessName}} All rights reserved.' }, $inc: { revision: 1 } });
  }
  return { changed: areas.length + Number(copyIndex >= 0) };
}
steps.followup = followup;
steps.orderCopy = async ({ apply = false } = {}) => {
  if (await Migration.exists({ _id: 'order-copy-v2' })) return { changed: 0 };
  const additions = {"order_extra_express": "Express surcharge:", "order_extra_preferences": "Care preferences:", "order_extra_discount": "Promo discount", "gateway_unavailable": "The secure payment gateway is unavailable. Your order remains unpaid. Retry online payment when the service is available."};
  let changed = 0;
  for (const pageKey of ['orders', 'order-success']) {
    const page = await SiteContent.findOne({ pageKey }).lean();
    const index = page?.sections?.findIndex(section => section.key === 'copy');
    const entries = page?.sections?.[index]?.content?.entries;
    if (!entries?.length) continue; // An intentionally empty/removed section stays empty.
    const missing = Object.entries(additions).filter(([id]) => (pageKey === 'orders' || id !== 'gateway_unavailable') && !entries.some(entry => entry.id === id)).map(([id, value]) => ({ id, value }));
    if (!missing.length) continue;
    changed++;
    if (apply) {
      const result = await SiteContent.updateOne({ _id: page._id, revision: page.revision }, { $push: { [`sections.${index}.content.entries`]: { $each: missing } }, $inc: { revision: 1 } });
      if (!result.modifiedCount) throw new Error('Order copy changed during migration. Review and retry.');
    }
  }
  if (apply) await Migration.updateOne({ _id: 'order-copy-v2' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  return { changed };
};

export async function migrationPlan() {
  const report = {};
  const errors = [];
  for (const [name, run] of Object.entries(steps)) {
    try {
      const result = await run();
      report[name] = { changed: result.changed ?? result.linked ?? 0, ...(result.pending ? { pending: result.pending } : {}) };
    } catch (error) { errors.push({ step: name, message: error.message }); }
  }
  const categories = await Category.find().lean();
  const garments = await Garment.find().lean();
  const orphaned = garments.filter(garment => garment.categoryId && !categories.some(category => String(category._id) === String(garment.categoryId)));
  if (orphaned.length) errors.push({ step: 'categories', message: `Missing category references: ${orphaned.map(garment => garment._id).join(', ')}` });
  const assets = await MediaAsset.find().lean();
  const unknownImages = garments.filter(garment => !garment.isCustom && !garment.imageUrl && !garment.primaryImage && !/shirt|polo|trouser|jeans|kurta|kurti|saree|salwar|kameez|suit|blazer|dress|gown|bedsheet|towel|curtain|quilt|comforter|rajai|jacket|sweater/i.test(garment.name));
  return { version: 1, steps: report, errors, warnings: unknownImages.map(garment => ({ garmentId: String(garment._id), message: 'No known legacy artwork. Keep neutral placeholder until an administrator selects an image.' })), counts: { garments: garments.length, categories: categories.length, media: assets.length } };
}

export async function migrateWebsite({ apply = false, directory = fileURLToPath(new URL('../../.local-backups/', import.meta.url)), afterStep } = {}) {
  const plan = await migrationPlan();
  if (!apply) return plan;
  if (plan.errors.length) throw new Error(`Migration preflight failed: ${plan.errors.map(error => `${error.step}: ${error.message}`).join('; ')}`);
  return withLock(async () => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const backup = `${directory}/website-${Date.now()}-${process.pid}.json`;
    const journal = { version: 1, database: mongoose.connection.name, createdAt: new Date(), status: 'prepared', plan, before: await migrationSnapshot(), completed: [] };
    await saveJournal(backup, journal);
    try {
      for (const [name, run] of Object.entries(steps)) {
        await run({ apply: true });
        journal.completed.push(name); journal.after = await migrationSnapshot();
        await saveJournal(backup, journal);
        await afterStep?.(name);
      }
      journal.status = 'applied';
    } catch (error) {
      journal.status = 'failed'; journal.error = error.message;
      throw Object.assign(new Error(`${error.message}. Recovery journal: ${backup}`), { backup });
    } finally {
      journal.after = await migrationSnapshot();
      journal.afterHash = snapshotHash(journal.after);
      await saveJournal(backup, journal);
    }
    return { ...plan, backup, status: journal.status };
  });
}

export async function rollbackWebsite(path, { apply = false } = {}) {
  const journal = EJSON.parse(await readFile(path, 'utf8'));
  if (journal.version !== 1 || !journal.before || !journal.afterHash || journal.database !== mongoose.connection.name) throw new Error('Invalid, incomplete or different-database recovery journal.');
  if (snapshotHash(await migrationSnapshot()) !== journal.afterHash) throw new Error('Rollback refused: content changed after migration. Restore selectively from the backup so later admin changes are preserved.');
  if (!apply) return { ready: true, collections: models.map(model => model.collection.name) };
  return withLock(async () => {
    // Run with administrative writes stopped, as documented. Never touch orders/users/payments.
    if (snapshotHash(await migrationSnapshot()) !== journal.afterHash) throw new Error('Rollback refused: data changed during verification.');
    for (const model of [...models].reverse()) {
      await model.collection.deleteMany(model === Migration ? { _id: { $ne: lockId } } : {});
      const records = journal.before[model.collection.name];
      if (records?.length) await model.collection.insertMany(records);
    }
    if (snapshotHash(await migrationSnapshot()) !== snapshotHash(journal.before)) throw new Error('Rollback verification failed; retain this recovery journal.');
    return { restored: true };
  });
}
