import mongoose from 'mongoose';
import { access } from 'node:fs/promises';
import { PAGE_DEFAULTS } from '../content/pageDefaults.js';
import { GLOBAL_DEFAULT, GLOBAL_MEDIA } from '../content/globalDefaults.js';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import Migration from '../models/Migration.js';
import { HOME_DEFAULT, HOME_MEDIA } from '../content/homeDefaults.js';
import { validatePageContent, mediaReferences } from '../../shared/contentSchema.mjs';

export async function contentMigration({ apply = false } = {}) {
  const pages = await SiteContent.find().lean();
  const assets = await MediaAsset.find().lean();
  const definitions = [HOME_DEFAULT, GLOBAL_DEFAULT, ...PAGE_DEFAULTS];
  const completed = await Migration.exists({ _id: 'website-content-v1' });
  const pending = completed ? [] : definitions.filter(page => !pages.some(existing => existing.pageKey === page.pageKey));
  const plannedAssets = new Map();
  function resolve(value) {
    if (!value || typeof value !== 'object') return value;
    if (value.sourceKey) {
      const definition = { ...HOME_MEDIA, ...GLOBAL_MEDIA }[value.sourceKey];
      if (!definition) throw new Error(`Missing migration asset: ${value.sourceKey}`);
      let asset = assets.find(asset => asset.sourceKey === value.sourceKey) || plannedAssets.get(value.sourceKey);
      if (!asset) {
        asset = { _id: new mongoose.Types.ObjectId(), ...definition, provider: 'local', scope: 'website', status: 'ready' };
        plannedAssets.set(value.sourceKey, asset);
      }
      return { assetId: String(asset._id), decorative: !definition.defaultAlt };
    }
    if (Array.isArray(value)) return value.map(resolve);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolve(child)]));
  }
  const ready = pending.map(page => resolve(structuredClone(page)));
  // Validate every page and bundled asset before the first write, including dry runs.
  for (const asset of plannedAssets.values()) {
    await new MediaAsset(asset).validate();
    await access(new URL(`../../client/public${asset.url}`, import.meta.url));
  }
  for (const page of ready) validatePageContent(page);
  if (apply && !completed) {
    for (const asset of plannedAssets.values()) await MediaAsset.create(asset);
    for (const page of ready) {
      const mediaAssetIds = [...new Set(mediaReferences(page).map(ref => ref.assetId))];
      await SiteContent.updateOne({ pageKey: page.pageKey }, { $setOnInsert: { ...page, mediaAssetIds } }, { upsert: true });
    }
    await Migration.updateOne({ _id: 'website-content-v1' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  return { pages, assets, changed: pending.length, pending: pending.map(page => page.pageKey) };
}
