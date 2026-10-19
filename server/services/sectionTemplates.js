import { HOME_DEFAULT, HOME_MEDIA } from '../content/homeDefaults.js';
import { GLOBAL_DEFAULT, GLOBAL_MEDIA } from '../content/globalDefaults.js';
import { PAGE_DEFAULTS } from '../content/pageDefaults.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { PAGE_SECTIONS, CONTENT_SCHEMAS, blankContentValue } from '../../shared/contentSchema.mjs';

// These templates are used only when an admin explicitly adds a section.
// Reads and migrations never restore deleted sections or archived images.
export async function sectionTemplates(pageKey) {
  const definition = [HOME_DEFAULT, GLOBAL_DEFAULT, ...PAGE_DEFAULTS].find(page => page.pageKey === pageKey);
  const [assets, config] = await Promise.all([
    MediaAsset.find({ scope: 'website', status: 'ready' }).lean(),
    PlatformConfig.findOne().lean(),
  ]);
  function resolve(value) {
    if (!value || typeof value !== 'object') return value;
    if (value.sourceKey) {
      const original = { ...HOME_MEDIA, ...GLOBAL_MEDIA }[value.sourceKey];
      // Early homepage migrations did not store sourceKey. Match only the
      // exact bundled local image and crop for those legacy library entries.
      const asset = assets.find(item => item.sourceKey === value.sourceKey) || assets.find(item =>
        !item.sourceKey && item.provider === 'local' && item.url === original?.url &&
        item.crop?.position === original?.crop?.position && item.crop?.size === original?.crop?.size);
      return asset ? { assetId: String(asset._id), decorative: !asset.defaultAlt } : null;
    }
    if (Array.isArray(value)) return value.map(resolve);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolve(child)]));
  }
  return Object.entries(PAGE_SECTIONS[pageKey]).map(([key, type], sortOrder) => {
    const original = definition?.sections.find(section => section.key === key);
    const section = original ? resolve(structuredClone(original)) : { key, type, sortOrder, isVisible: true, content: blankContentValue(CONTENT_SCHEMAS[type]) };
    if (type === 'hero') section.content.turnaroundHours = Math.max(section.content.turnaroundHours, Math.ceil(config?.minStandardTurnaroundHours || 48));
    if (type === 'textBlocks' && !original) Object.assign(section.content, { plain: 'New section', items: [{ id: 'item_1', isVisible: true, sortOrder: 0, title: '', paragraphs: ['Add your text here.'], image: null }] });
    return section;
  });
}
