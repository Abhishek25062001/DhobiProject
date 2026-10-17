import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { contentMigration } from '../services/contentMigration.js';
import { optionsMigration } from '../services/optionsMigration.js';
import { bindContentText, PAGE_KEYS } from '../../shared/contentSchema.mjs';
import { contentTestHarness } from './contentTestHarness.mjs';

test('T12 global and public-page content administration', async t => {
  const { request } = await contentTestHarness(t);
  const config = await PlatformConfig.create({ gstPercentage: 0, freeDeliveryThreshold: 0, deliveryFee: 0, supportEmail: 'support@example.test' });
  await contentMigration({ apply: true });
  let global;
  await t.test('every page has saved content and every rendered copy key resolves', async () => {
    assert.equal(await SiteContent.countDocuments(), PAGE_KEYS.length);
    const sources = { global: ['components/Navbar', 'components/Footer'], book: ['pages/BookingPage', 'components/booking/BookingGarmentCard'], pricing: ['pages/PricingPage'], areas: ['pages/OperationalAreasPage'], terms: ['pages/TermsOfServicePage'], privacy: ['pages/PrivacyPolicyPage'], login: ['pages/LoginPage'], register: ['pages/RegisterPage'], profile: ['pages/ProfilePage'], orders: ['pages/MyOrdersPage', 'components/PaymentModal', 'components/ActiveOrderTracker'], 'order-success': ['pages/OrderSuccessPage'] };
    for (const [pageKey, files] of Object.entries(sources)) {
      const page = (await request(`/content/${pageKey}`)).body.page;
      const keys = new Set(page.sections.find(section => section.key === 'copy').content.entries.map(entry => entry.id));
      for (const file of files) {
        const source = await readFile(new URL(`../../client/src/${file}.jsx`, import.meta.url), 'utf8');
        for (const match of source.matchAll(/\bcopy\('([^']+)'\)/g)) assert.ok(keys.has(match[1]), `${file}: missing ${match[1]}`);
      }
    }
    global = (await request('/admin/content/global', { role: 'admin' })).body.page;
  });
  await t.test('branding, navigation, footer links and SEO publish; hiding and image removal persist', async () => {
    global.sections.find(section => section.key === 'branding').content.name = 'Updated brand';
    global.sections.find(section => section.key === 'branding').content.logo = null;
    const nav = global.sections.find(section => section.key === 'navigation').content.items;
    nav[0].isVisible = false;
    nav[1].label = 'Schedule laundry'; nav[1].sortOrder = -1;
    global.sections.find(section => section.key === 'footerLinks').content.items[0].label = 'Your privacy';
    global.seo.title = 'Updated sharing title';
    assert.equal((await request('/admin/content/global', { method: 'PUT', role: 'admin', body: global })).status, 200);
    const page = (await request('/content/global')).body.page;
    assert.equal(page.sections.find(section => section.key === 'branding').content.name, 'Updated brand');
    assert.equal(page.sections.find(section => section.key === 'branding').content.logo, null);
    assert.equal(page.sections.find(section => section.key === 'navigation').content.items.length, 4);
    assert.equal(page.seo.title, 'Updated sharing title');
    assert.equal((await contentMigration({ apply: true })).changed, 0);
    global = (await request('/admin/content/global', { role: 'admin' })).body.page;
    global.sections.find(section => section.key === 'navigation').content.items[0].href = 'javascript:alert(1)';
    assert.equal((await request('/admin/content/global', { method: 'PUT', role: 'admin', body: global })).status, 400);
  });
  await t.test('identity and fee bindings preserve zeros and propagate new owner values', async () => {
    const page = (await request('/content/pricing')).body.page;
    const fee = page.sections[0].content.entries.find(entry => entry.id.startsWith('for_orders_under_'));
    const editable = (await request('/admin/content/pricing', { role: 'admin' })).body.page;
    editable.sections[0].content.entries.find(entry => entry.id === fee.id).value = 'Always pay 5% tax.';
    assert.equal((await request('/admin/content/pricing', { method: 'PUT', role: 'admin', body: editable })).status, 400);
    assert.match(bindContentText(fee.value, config), /under ₹0.*₹0.*0% GST/);
    const privacy = (await request('/content/privacy')).body.page;
    const email = privacy.sections[0].content.entries.find(entry => entry.id === 'care_indodhobi_com_f7714c9');
    assert.equal(bindContentText(email.value, config), 'support@example.test');
    const changed = await request('/config/settings', { method: 'PUT', role: 'admin', body: { supportEmail: 'new@example.test', businessAddress: 'Updated address', gstPercentage: 12 } });
    assert.equal(changed.status, 200);
    assert.equal(bindContentText(email.value, changed.body.config), 'new@example.test');
    assert.match(bindContentText(fee.value, changed.body.config), /12% GST/);
    await optionsMigration({ apply: true });
    assert.equal((await PlatformConfig.findById(config._id)).supportEmail, 'new@example.test');
  });
  await t.test('favicon replacement is versioned and public reads never recreate absent pages', async () => {
    const asset = await MediaAsset.findOne({ sourceKey: 'global-favicon' });
    await MediaAsset.updateOne({ _id: asset._id }, { version: 2, url: '/images/laundry/brand-mark.svg' });
    const page = (await request('/content/global')).body.page;
    assert.equal(page.sections.find(section => section.key === 'branding').content.favicon.asset.version, 2);
    await SiteContent.deleteOne({ pageKey: 'register' });
    assert.equal((await request('/content/register')).body.page, null);
    assert.equal(await SiteContent.countDocuments({ pageKey: 'register' }), 0);
  });
  await t.test('profile preferences accept active configuration choices and clearing, not unavailable choices', async () => {
    assert.equal((await request('/auth/profile', { method: 'PUT', role: 'customer', body: { preferences: { defaultDetergent: 'unknown' } } })).status, 400);
    assert.equal((await request('/auth/profile', { method: 'PUT', role: 'customer', body: { preferences: { defaultDetergent: '', defaultPackaging: '' } } })).status, 200);
    assert.equal((await request('/auth/profile', { method: 'PUT', role: 'customer', body: { preferences: { defaultDetergent: 'Standard', defaultPackaging: 'Folded' } } })).status, 200);
  });

});
