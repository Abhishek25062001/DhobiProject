import Garment from '../models/Garment.js';
import MediaAsset from '../models/MediaAsset.js';
import { legacyGarmentPresentation } from '../../shared/legacyCatalog.mjs';

const positions = { kurti: '0% 0%', trousers: '50% 0%', tshirt: '100% 0%', linen: '0% 50%', suit: '50% 50%', saree: '100% 50%' };
export async function mediaMigration({ apply = false } = {}) {
  const garments = await Garment.find().lean();
  const assets = await MediaAsset.find().lean();
  const pending = garments.filter(g => !Object.hasOwn(g, 'primaryImage'));
  const invalid = pending.find(g => g.imageUrl && !g.imageUrl.startsWith('https://'));
  if (invalid) throw new Error(`Image on garment ${invalid._id} requires manual migration to verified storage.`);
  for (const garment of pending) {
    if (!apply) continue;
    let media;
    if (garment.imageUrl) {
      if (!garment.imageUrl.startsWith('https://')) throw new Error(`Image on garment ${garment._id} requires manual migration to verified storage.`);
      media = { url: garment.imageUrl, provider: 'external' };
    } else if (!garment.isCustom && /shirt|polo|trouser|jeans|kurta|kurti|saree|salwar|kameez|suit|blazer|dress|gown|bedsheet|towel|curtain|quilt|comforter|rajai|jacket|sweater/i.test(garment.name)) {
      const { kind } = legacyGarmentPresentation(garment);
      media = { provider: 'local', url: kind === 'shirt' ? '/images/laundry/shirt-after-480.webp' : kind === 'curtain' ? '/images/laundry/catalog-curtain.svg' : '/images/laundry/laundry-atlas.webp',
        ...(positions[kind] ? { crop: { position: positions[kind], size: '300% 300%', kind } } : {}) };
    }
    const asset = media ? await MediaAsset.findOneAndUpdate({ sourceKey: `catalog-${garment._id}-primary` }, {
      $setOnInsert: { ...media, name: `${garment.name} photo`, defaultAlt: garment.name, status: 'ready', scope: 'website' },
    }, { upsert: true, new: true }) : null;
    await Garment.updateOne({ _id: garment._id, primaryImage: { $exists: false } }, { $set: { primaryImage: asset ? { assetId: asset._id } : null } });
  }
  return { changed: pending.length, garments, assets };
}
