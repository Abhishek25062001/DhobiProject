import { REQUIRED_COPY_BINDINGS } from './contentBindings.mjs';
import { SERVICE_CODES, IRONING_CODES } from './catalogContract.mjs';

const text = { kind: 'text', max: 5000 };
const short = { kind: 'text', max: 180 };
const link = { kind: 'link' };
const media = { kind: 'media' };
const bool = { kind: 'boolean' };
const number = (min = 0, max = 10000) => ({ kind: 'number', min, max });
const choice = values => ({ kind: 'choice', values });
const object = fields => ({ kind: 'object', fields });
const list = item => ({ kind: 'list', item, max: 100 });
const repeated = fields => object({ id: short, isVisible: bool, sortOrder: number(-10000), ...fields });
const heading = { eyebrow: short, plain: short, accent: short, intro: text };
export const CONTENT_BINDINGS = Object.freeze(['freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'gstPercentage', 'minStandardTurnaroundHours', 'expressTurnaroundHours', 'businessName', 'supportPhone', 'gstin', 'sacCode', 'supportEmail', 'businessAddress', 'supportHours', 'privacyEmail', 'legalEmail']);
export const CONTENT_ICONS = Object.freeze(['Shirt', 'Wind', 'Truck', 'Smartphone', 'Package', 'Clock3', 'ShieldCheck', 'Leaf', 'Sparkles', 'MapPin', 'CreditCard', 'Building2', 'CheckCircle2', 'HeartHandshake']);
export const CONTENT_SCHEMAS = {
  hero: object({ eyebrow: short, plain: short, accent: short, description: text, notePlain: short, noteAccent: short, actionLabel: short, actionHref: link, pickupText: text, turnaroundHours: number(1, 720), paymentText: short, coverageLabel: short, coverageHref: link, beforeLabel: short, afterLabel: short, compareLabel: short, compareHelp: text, beforeImage: media, afterImage: media,
    benefits: list(repeated({ icon: choice(CONTENT_ICONS), title: short, subtitle: text })) }),
  journey: object({ eyebrow: short, plain: short, accent: short, suffix: short, intro: text, stages: list(repeated({ title: short, description: text, image: media })) }),
  services: object({ ...heading, actionLabel: short, pricePrefix: short, priceUnit: short, unavailableText: text, items: list(repeated({ title: short, description: text, badge: short, image: media, service: choice(SERVICE_CODES), ironing: choice(IRONING_CODES) })) }),
  comparison: object({ ...heading, firstColumn: short, ownColumn: short, otherColumn: short, scrollHint: text, caption: text, actionLabel: short, actionHref: link, items: list(repeated({ feature: short, icon: choice(CONTENT_ICONS), own: text, other: text })) }),
  testimonials: object({ ...heading, items: list(repeated({ name: short, role: short, comment: text, rating: number(0, 5), avatar: media })) }),
  areaHeading: object({ ...heading, actionLabel: short, actionHref: link }),
  copy: object({ entries: { ...list(object({ id: short, value: text })), max: 1000 } }),
  navigation: object({ title: short, items: list(repeated({ label: short, href: link, audience: choice(['all', 'guest', 'customer']), highlight: bool })) }),
  links: object({ title: short, items: list(repeated({ label: short, href: link })) }),
  branding: object({ name: short, accent: short, tagline: text, description: text, logo: media, favicon: media }),
  assurances: object({ items: list(repeated({ title: short, description: text, icon: choice(CONTENT_ICONS), image: media })) }),
  textBlocks: object({ ...heading, items: list(repeated({ title: short, paragraphs: list(text), image: media })) }),
};
export const PAGE_KEYS = Object.freeze(['home', 'book', 'pricing', 'global', 'terms', 'privacy', 'areas', 'login', 'register', 'profile', 'orders', 'order-success']);
export const SEO_SCHEMA = object({ title: short, description: text, image: media });
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;
export function safeContentLink(value) {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (/[\s\\\u0000-\u001f]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return /^\/(?:book|pricing|operational-areas|terms|privacy|login|register|profile|my-orders|order-success)?(?:[/?#][a-zA-Z0-9_/?#=&%.-]*)?$/.test(value) || value === '/';
  if (/^#[a-zA-Z][\w-]*$/.test(value)) return true;
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || /^tel:\+?[\d()-]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function fail(path, message) { throw new Error(`${path}: ${message}`); }
export function validateContentValue(schema, value, path = 'Content') {
  switch (schema.kind) {
    case 'text':
      if (typeof value !== 'string' || value.length > schema.max) fail(path, `Enter text of at most ${schema.max} characters.`);
      for (const match of value.matchAll(/\{\{([^}]+)\}\}/g)) if (!CONTENT_BINDINGS.includes(match[1].replace(/^config\./, '')) && match[1] !== 'home.turnaroundHours') fail(path, 'Unknown configuration binding.');
      return value;
    case 'link': if (!safeContentLink(value)) fail(path, 'Use a supported page, HTTPS, email or telephone link.'); return value;
    case 'boolean': if (typeof value !== 'boolean') fail(path, 'Choose true or false.'); return value;
    case 'number': if (!Number.isFinite(value) || !Number.isInteger(value) || value < schema.min || value > schema.max) fail(path, `Enter a whole number from ${schema.min} to ${schema.max}.`); return value;
    case 'choice': if (!schema.values.includes(value)) fail(path, 'Choose a supported value.'); return value;
    case 'media':
      if (value === null) return null;
      if (!value || !/^[a-f\d]{24}$/i.test(String(value.assetId)) || typeof value.decorative !== 'boolean' || (value.alt !== undefined && (typeof value.alt !== 'string' || value.alt.length > 500))) fail(path, 'Choose an image from the media library.');
      if (Object.keys(value).some(key => !['assetId', 'alt', 'decorative'].includes(key))) fail(path, 'Unknown image field.');
      return value;
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'Expected structured content.');
      for (const key of Object.keys(value)) if (!Object.hasOwn(schema.fields, key)) fail(`${path}.${key}`, 'Unknown field.');
      for (const [key, field] of Object.entries(schema.fields)) validateContentValue(field, value[key], `${path}.${key}`);
      return value;
    case 'list':
      if (!Array.isArray(value) || value.length > schema.max) fail(path, `Maximum ${schema.max} items.`);
      value.forEach((item, index) => validateContentValue(schema.item, item, `${path}[${index + 1}]`));
      if (schema.item.fields?.id) {
        if (value.some(item => !identifier.test(item.id)) || new Set(value.map(item => item.id)).size !== value.length) fail(path, 'Items need unique, stable identifiers.');
      }
      return value;
    default: fail(path, 'Unknown field type.');
  }
}
export function blankContentValue(schema) {
  if (schema.kind === 'object') return Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => [key, blankContentValue(field)]));
  if (schema.kind === 'list') return [];
  if (schema.kind === 'media') return null;
  if (schema.kind === 'boolean') return true;
  if (schema.kind === 'number') return Math.max(0, schema.min);
  if (schema.kind === 'choice') return schema.values[0];
  return '';
}
export function validatePageContent(page) {
  if (!PAGE_KEYS.includes(page.pageKey) || page.schemaVersion !== 1) fail('Page', 'Unsupported page or schema version.');
  if (!Number.isInteger(page.revision) || page.revision < 0) fail('Revision', 'Load a current revision before saving.');
  validateContentValue(SEO_SCHEMA, page.seo, 'SEO');
  if (!Array.isArray(page.sections) || page.sections.length > 60) fail('Sections', 'Maximum 60 sections.');
  const seen = new Set();
  for (const section of page.sections) {
    if (!identifier.test(section.key) || seen.has(section.key)) fail('Sections', 'Section keys must be unique.');
    seen.add(section.key);
    if (PAGE_SECTIONS[page.pageKey]?.[section.key] !== section.type) fail(section.key, 'This section does not belong to this page.');
    if (!Object.hasOwn(CONTENT_SCHEMAS, section.type)) fail(section.key, 'Unsupported section type.');
    if (typeof section.isVisible !== 'boolean' || !Number.isInteger(section.sortOrder)) fail(section.key, 'Visibility and display order are required.');
    if (Object.keys(section).some(key => !['key', 'type', 'isVisible', 'sortOrder', 'content'].includes(key))) fail(section.key, 'Unknown section field.');
    validateContentValue(CONTENT_SCHEMAS[section.type], section.content, section.key);
    if (section.type === 'copy') for (const entry of section.content.entries) {
      if (!entry.value.trim()) continue;
      for (const binding of REQUIRED_COPY_BINDINGS[entry.id] || []) if (!entry.value.includes(`{{${binding}}}`)) fail(entry.id, `Keep the live {{${binding}} binding, or clear this text.`);
    }
  }
  return page;
}
export function mediaReferences(value, found = []) {
  if (value && typeof value === 'object') {
    if (Object.hasOwn(value, 'assetId')) found.push(value);
    else Object.values(value).forEach(child => mediaReferences(child, found));
  }
  return found;
}
export const visibleContentItems = items => (items || []).filter(item => item.isVisible !== false).slice().sort((a, b) => a.sortOrder - b.sortOrder);
export function bindContentText(value, config, bindings = {}) {
  return String(value ?? '').replace(/\{\{([^}]+)\}\}/g, (_, name) => {
    if (name === 'home.turnaroundHours') return String(bindings[name] ?? '—');
    const key = name.replace(/^config\./, '');
    return CONTENT_BINDINGS.includes(key) ? String(config?.[key] ?? '—') : '';
  });
}

export const PAGE_SECTIONS = Object.freeze({
  home: { hero: 'hero', journey: 'journey', services: 'services', comparison: 'comparison', testimonials: 'testimonials', areas: 'areaHeading', copy: 'copy' },
  book: { copy: 'copy', assurances: 'assurances' },
  global: { branding: 'branding', navigation: 'navigation', footerServices: 'links', footerLinks: 'links', assurances: 'assurances', copy: 'copy' },
  pricing: { copy: 'copy' }, terms: { copy: 'copy', blocks: 'textBlocks' }, privacy: { copy: 'copy', blocks: 'textBlocks' }, areas: { copy: 'copy' },
  login: { copy: 'copy' }, register: { copy: 'copy' }, profile: { copy: 'copy' }, orders: { copy: 'copy' }, 'order-success': { copy: 'copy' },
});
