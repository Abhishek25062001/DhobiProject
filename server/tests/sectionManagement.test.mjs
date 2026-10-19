import { test } from 'node:test';
import assert from 'node:assert/strict';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { contentMigration } from '../services/contentMigration.js';
import { contentTestHarness } from './contentTestHarness.mjs';
import { PAGE_KEYS, PAGE_SECTIONS, CONTENT_SCHEMAS, blankContentValue, newCustomSection, validatePageContent } from '../../shared/contentSchema.mjs';

test('section management publishes additions and deletions without restoring removed content', async t => {
  const { request } = await contentTestHarness(t);
  await PlatformConfig.create({ minStandardTurnaroundHours: 72 });
  const adminPage = async (key = 'home') => (await request(`/admin/content/${key}`, { role: 'admin' })).body.page;
  const publicPage = async (key = 'home') => (await request(`/content/${key}`)).body.page;
  const templates = async (key = 'home') => (await request(`/admin/content/${key}/section-templates`, { role: 'admin' })).body.sections;
  const save = async page => {
    const response = await request(`/admin/content/${page.pageKey}`, { method: 'PUT', role: 'admin', body: page });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.page;
  };

  await t.test('template reads require an admin and never seed pages or images', async () => {
    assert.equal((await request('/admin/content/home/section-templates')).status, 401);
    assert.equal((await request('/admin/content/home/section-templates', { role: 'customer' })).status, 403);
    assert.equal((await request('/admin/content/unknown/section-templates', { role: 'admin' })).status, 404);
    const defaults = await templates();
    assert.equal(defaults.find(section => section.key === 'hero').content.turnaroundHours, 72);
    assert.equal(defaults.find(section => section.key === 'hero').content.beforeImage, null);
    assert.equal(await SiteContent.countDocuments(), 0);
    assert.equal(await MediaAsset.countDocuments(), 0);
  });

  await contentMigration({ apply: true });
  // The historical migration starts with 48 hours; use the current configured
  // minimum before testing saves of a complete homepage.
  await SiteContent.updateOne({ pageKey: 'home', 'sections.key': 'hero' }, { $set: { 'sections.$.content.turnaroundHours': 72 } });

  await t.test('every page gets valid preset defaults with useful copy and current image references', async () => {
    for (const key of PAGE_KEYS) {
      const sections = await templates(key);
      assert.deepEqual(sections.map(section => section.key), Object.keys(PAGE_SECTIONS[key]));
      const page = await adminPage(key);
      validatePageContent({ ...page, sections });
      assert.ok(sections.find(section => section.type === 'copy').content.entries.length > 0);
    }
    const hero = (await templates()).find(section => section.key === 'hero');
    assert.ok(hero.content.beforeImage.assetId);
    assert.equal(hero.content.turnaroundHours, 72);
  });

  await t.test('deleting a preset persists after reload and releases unused images without deleting them', async () => {
    const page = await adminPage();
    const removedHero = page.sections.find(section => section.key === 'hero');
    const uniqueImage = await MediaAsset.create({ name: 'Section only', provider: 'local', url: '/images/laundry/scene-before.webp' });
    removedHero.content.beforeImage = { assetId: String(uniqueImage._id), decorative: true };
    const withImage = await save(page);
    assert.equal((await request(`/media/${uniqueImage._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
    const remaining = withImage.sections.filter(section => section.key !== 'hero');
    const saved = await save({ ...withImage, sections: remaining });
    assert.deepEqual((await adminPage()).sections, remaining);
    assert.ok(!(await publicPage()).sections.some(section => section.key === 'hero'));
    assert.ok(!saved.mediaAssetIds.includes(String(uniqueImage._id)));
    assert.equal((await MediaAsset.findById(uniqueImage._id)).status, 'ready');
    assert.equal((await request(`/media/${uniqueImage._id}`, { method: 'DELETE', role: 'admin' })).status, 200);
  });

  await t.test('deleted presets can be restored and published with valid editable defaults', async () => {
    const page = await adminPage();
    const hero = (await templates()).find(section => section.key === 'hero');
    hero.content.plain = 'Restored hero';
    await save({ ...page, sections: [...page.sections, hero] });
    const published = (await publicPage()).sections.find(section => section.key === 'hero');
    assert.equal(published.content.plain, 'Restored hero');
    assert.equal(published.content.turnaroundHours, 72);
  });

  await t.test('archived default images stay archived when a preset is added again', async () => {
    const hero = (await templates()).find(section => section.key === 'hero');
    // Older installations have bundled images without source keys.
    await MediaAsset.updateOne({ _id: hero.content.beforeImage.assetId }, { $unset: { sourceKey: '' } });
    assert.equal((await templates()).find(section => section.key === 'hero').content.beforeImage.assetId, hero.content.beforeImage.assetId);
    await MediaAsset.updateOne({ _id: hero.content.beforeImage.assetId }, { status: 'archived' });
    assert.equal((await templates()).find(section => section.key === 'hero').content.beforeImage, null);
    // Replace the existing reference with the newly available template.
    const page = await adminPage();
    page.sections = page.sections.filter(section => section.key !== 'hero');
    page.sections.push((await templates()).find(section => section.key === 'hero'));
    await save(page);
  });

  let customImage;
  await t.test('multiple custom sections publish in order with text, image and hidden item handling', async () => {
    customImage = await MediaAsset.create({ name: 'Custom section image', provider: 'local', url: '/images/laundry/scene-after.webp' });
    const first = newCustomSection('custom_first');
    first.sortOrder = -2;
    first.content.plain = 'Our laundry promise';
    first.content.items[0].image = { assetId: String(customImage._id), decorative: false, alt: 'Fresh laundry' };
    first.content.items[0].paragraphs = ['We care for every garment.'];
    first.content.items.push({ ...first.content.items[0], id: 'hidden', isVisible: false, paragraphs: ['Private draft'] });
    const second = newCustomSection('custom_second'); second.sortOrder = -1;
    const page = await adminPage();
    await save({ ...page, sections: [...page.sections, second, first] });
    const visible = (await publicPage()).sections;
    assert.deepEqual(visible.slice(0, 2).map(section => section.key), ['custom_first', 'custom_second']);
    assert.equal(visible[0].content.items[0].image.asset.url, customImage.url);
    assert.equal(visible[0].content.items[0].image.alt, 'Fresh laundry');
    assert.equal(visible[0].content.items.length, 1);
    assert.equal((await adminPage()).sections.find(section => section.key === 'custom_first').content.items.length, 2);
  });

  await t.test('custom sections can be hidden, restored, and deleted independently', async () => {
    let page = await adminPage();
    page.sections.find(section => section.key === 'custom_first').isVisible = false;
    page = await save(page);
    assert.ok(!(await publicPage()).sections.some(section => section.key === 'custom_first'));
    assert.equal((await request(`/media/${customImage._id}`, { method: 'DELETE', role: 'admin' })).status, 409);
    page.sections.find(section => section.key === 'custom_first').isVisible = true;
    page = await save(page);
    assert.ok((await publicPage()).sections.some(section => section.key === 'custom_first'));
    page = await save({ ...page, sections: page.sections.filter(section => section.key !== 'custom_first') });
    assert.ok(page.sections.some(section => section.key === 'custom_second'));
    assert.ok(!(await publicPage()).sections.some(section => section.key === 'custom_first'));
    assert.equal((await MediaAsset.findById(customImage._id)).status, 'ready');
    assert.equal((await request(`/media/${customImage._id}`, { method: 'DELETE', role: 'admin' })).status, 200);
  });

  await t.test('custom section support cannot bypass slot types, duplicate keys, image or schema validation', async () => {
    const page = await adminPage();
    const candidates = [
      { ...newCustomSection('custom_hero'), type: 'hero', content: blankContentValue(CONTENT_SCHEMAS.hero) },
      newCustomSection('hero'), newCustomSection('custom_'),
      { ...newCustomSection('custom_html'), type: 'rawHtml', content: '<script>alert(1)</script>' },
      { ...newCustomSection('custom_fields'), content: { ...newCustomSection('x').content, css: 'display:none' } },
      page.sections.find(section => section.key === 'custom_second'),
    ];
    for (const section of candidates) {
      const result = await request('/admin/content/home', { method: 'PUT', role: 'admin', body: { ...page, sections: [...page.sections, section] } });
      assert.equal(result.status, 400, JSON.stringify(section));
    }
    assert.equal((await adminPage()).revision, page.revision);
  });

  await t.test('custom sections work on all editable pages, including global content', async () => {
    for (const key of PAGE_KEYS.filter(key => key !== 'home')) {
      const page = await adminPage(key);
      await save({ ...page, sections: [...page.sections, newCustomSection(`custom_${key}`)] });
      assert.ok((await publicPage(key)).sections.some(section => section.key === `custom_${key}`));
    }
  });

  await t.test('stale saves cannot undo a deletion, and migrations do not resurrect deleted sections', async () => {
    const original = await adminPage();
    const saved = await save({ ...original, sections: original.sections.filter(section => section.key !== 'custom_second') });
    const stale = await request('/admin/content/home', { method: 'PUT', role: 'admin', body: original });
    assert.equal(stale.status, 409);
    await contentMigration({ apply: true });
    assert.deepEqual((await adminPage()).sections, saved.sections);
  });

  await t.test('all sections can be removed and a page remains empty until an explicit addition', async () => {
    await save({ ...await adminPage(), sections: [] });
    await contentMigration({ apply: true });
    assert.deepEqual((await adminPage()).sections, []);
    assert.deepEqual((await publicPage()).sections, []);
    const page = await adminPage();
    await save({ ...page, sections: [newCustomSection('custom_fresh')] });
    assert.equal((await publicPage()).sections[0].content.plain, 'New custom section');
  });
});
