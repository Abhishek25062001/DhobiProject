import PlatformConfig from '../models/PlatformConfig.js';
import { LEGACY_HOME_CARE_OPTIONS } from '../../shared/legacyCatalog.mjs';

const shortLabels = { WASH_AND_FOLD: 'Wash & Fold', WASH_AND_IRON: 'Wash & Iron', IRON_ONLY: 'Iron Only', DRY_CLEAN: 'Dry Clean', STANDARD_STEAM: 'Steam', CRISP_STARCH: 'Crisp starch', DELICATE_PRESS: 'Delicate' };
export async function optionsMigration({ apply = false } = {}) {
  const configs = await PlatformConfig.collection.find().toArray();
  let changed = 0;
  for (const config of configs) {
    const fields = {};
    for (const [key, value] of Object.entries({ supportEmail: 'care@indodhobi.com', privacyEmail: 'privacy@indodhobi.com', legalEmail: 'legal@indodhobi.com', supportHours: '7 AM - 10 PM', businessAddress: 'Barakhamba Road, Connaught Place, New Delhi, Delhi 110001' })) if (!Object.hasOwn(config, key)) fields[key] = value;
    if (!Object.hasOwn(config, 'expressTurnaroundHours')) fields.expressTurnaroundHours = 24;
    if (!Object.hasOwn(config, 'homeCareOptions')) fields.homeCareOptions = LEGACY_HOME_CARE_OPTIONS.map((option, sortOrder) => ({ ...option, icon: option.id, sortOrder, isActive: true }));
    for (const key of ['serviceTypes', 'ironingTiers', 'detergentOptions', 'packagingOptions']) {
      if (!Array.isArray(config[key])) continue;
      config[key].forEach((option, index) => {
        if (!Object.hasOwn(option, 'shortName')) fields[`${key}.${index}.shortName`] = shortLabels[option.code] || '';
        if (!Object.hasOwn(option, 'sortOrder')) fields[`${key}.${index}.sortOrder`] = index;
      });
    }
    if (Object.keys(fields).length) changed++;
    if (apply) for (const [path, value] of Object.entries(fields)) await PlatformConfig.collection.updateOne({ _id: config._id, [path]: { $exists: false } }, { $set: { [path]: value } });
  }
  return { configs, changed };
}
