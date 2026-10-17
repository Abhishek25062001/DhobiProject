import Garment from '../models/Garment.js';
import { legacyGarmentPresentation } from '../../shared/legacyCatalog.mjs';
import { SERVICE_CODES, IRONING_CODES } from '../../shared/catalogContract.mjs';

export async function productMigration({ apply = false } = {}) {
  const garments = await Garment.find().lean();
  let changed = 0;
  for (const garment of garments) {
    const fields = {
      shortName: legacyGarmentPresentation(garment).name, description: '', sortOrder: 0,
      allowedServices: [...SERVICE_CODES], allowedIroningTiers: IRONING_CODES.filter(code => code !== 'NONE'),
    };
    const missing = Object.keys(fields).filter(key => !Object.hasOwn(garment, key));
    if (missing.length) changed++;
    if (apply) for (const key of missing) {
      await Garment.updateOne({ _id: garment._id, [key]: { $exists: false } }, { $set: { [key]: fields[key] } });
    }
  }
  return { garments, changed };
}
