import { publicGarment, publicCategory } from './publicProjection.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import MediaAsset from '../models/MediaAsset.js';
import { publicMedia } from './media.js';

export function categoryForGarment(garment, categories) {
  if (garment.categoryId) return categories.find(c => String(c._id) === String(garment.categoryId));
  const matches = categories.filter(c => c.name === garment.category || c.legacyNames?.includes(garment.category) ||
    (c.slug === 'household-bedding' && garment.category === 'Household'));
  return matches.length === 1 ? matches[0] : undefined;
}

export function presentGarment(garment, categories, assets = []) {
  const raw = garment.toObject ? garment.toObject() : garment;
  const category = categoryForGarment(raw, categories);
  const project = ref => ref ? { assetId: ref.assetId, alt: ref.alt, decorative: ref.decorative, asset: publicMedia(assets.find(asset => String(asset._id) === String(ref.assetId))) } : null;
  const media = { primaryImage: project(raw.primaryImage), imageUrl: project(raw.primaryImage)?.asset?.url || '' };
  return { ...publicGarment(raw), ...media, gallery: (raw.gallery || []).map(project), categoryId: category?._id || raw.categoryId || null,
    category: category?.name || raw.category, categoryDetails: publicCategory(category) };
}

async function mediaFor(records) {
  const ids = records.flatMap(g => [g.primaryImage?.assetId, ...(g.gallery || []).map(ref => ref.assetId)]).filter(Boolean);
  return MediaAsset.find({ _id: { $in: ids }, status: 'ready', scope: 'website' }).lean();
}

export async function serializeGarment(garment, categories) {
  return presentGarment(garment, categories, await mediaFor([garment]));
}

export async function catalogRecords({ includeInactive = false, category = '', search = '' } = {}) {
  const [categories, records] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Garment.find(includeInactive ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);
  const query = search.trim().toLowerCase();
  const assets = await mediaFor(records);
  return records.map(g => presentGarment(g, categories, assets)).filter(g =>
    (includeInactive || g.categoryDetails?.isActive === true) &&
    (!category || category === 'All' || String(g.categoryId) === category || g.category === category) &&
    (!query || g.name.toLowerCase().includes(query))
  );
}

export async function resolveCategory(body, current) {
  const id = body.categoryId ?? (body.category ? undefined : current?.categoryId);
  const categories = await Category.find().lean();
  const category = id ? categories.find(c => String(c._id) === String(id)) : categoryForGarment({ category: body.category || current?.category }, categories);
  if (!category) throw Object.assign(new Error('Select an existing category.'), { statusCode: 400 });
  return category;
}
