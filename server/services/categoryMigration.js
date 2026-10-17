import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import Migration from '../models/Migration.js';
import { categoryForGarment } from './catalog.js';

export async function categoryMigration({ apply = false } = {}) {
  const categories = await Category.find().lean();
  const garments = await Garment.find().lean();
  const missing = garments.filter(g => !g.categoryId);
  const unresolved = missing.filter(g => !categoryForGarment(g, categories));
  if (unresolved.length) throw new Error(`Unmapped category for garment IDs: ${unresolved.map(g => g._id).join(', ')}`);
  if (apply) {
    for (const garment of missing) {
      const category = categoryForGarment(garment, categories);
      await Garment.updateOne({ _id: garment._id, categoryId: null }, { $set: { categoryId: category._id } });
    }
    // Preserve the current homepage labels without overwriting later admin edits.
    if (!await Migration.exists({ _id: 'category-labels-v1' })) {
      for (const [slug, shortName] of [['household-bedding', 'Home'], ['winter-heavy', 'Winter']]) {
        await Category.updateOne({ slug, $or: [{ shortName: '' }, { shortName: { $exists: false } }] }, { $set: { shortName } });
      }
      await Migration.updateOne({ _id: 'category-labels-v1' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
    }
  }
  return { totalGarments: garments.length, linked: missing.length, categories, garments };
}
