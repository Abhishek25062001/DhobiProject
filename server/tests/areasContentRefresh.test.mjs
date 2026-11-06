import { test } from 'node:test';
import assert from 'node:assert/strict';
import SiteContent from '../models/SiteContent.js';
import { PAGE_DEFAULTS } from '../content/pageDefaults.js';
import { planAreasContentRefresh, applyAreasContentRefresh } from '../services/areasContentRefresh.js';
import { bindContentText, validatePageContent } from '../../shared/contentSchema.mjs';
import { contentTestHarness } from './contentTestHarness.mjs';

const defaults = PAGE_DEFAULTS.find(page => page.pageKey === 'areas');
const headingId = 'our_operational_hubs_b64da69';
const introId = 'indodhobi_operates_commercial_temperature_controlled_laundry_and__ecd0ee0';
const entry = (page, id) => page.sections[0].content.entries.find(item => item.id === id);
function legacyPage() {
  const page = structuredClone(defaults);
  entry(page, headingId).value = 'Our Operational Hubs & ';
  entry(page, 'instant_pincode_checker_38bc744').value = 'Instant Pincode Checker';
  page.seo.title = 'Service Areas | IndoDhobi';
  page.seo.description = 'Service Areas';
  return page;
}

test('Areas refresh preserves custom, empty, removed and hidden content', () => {
  const page = legacyPage();
  entry(page, headingId).value = 'Your local laundry';
  entry(page, introId).value = '';
  page.sections[0].content.entries = page.sections[0].content.entries.filter(item => item.id !== 'instant_pincode_checker_38bc744');
  page.seo.title = 'Custom search title';
  page.seo.description = '';
  assert.equal(planAreasContentRefresh(page).changes.length, 0);
  page.sections[0].isVisible = false;
  entry(page, headingId).value = 'Our Operational Hubs & ';
  assert.equal(planAreasContentRefresh(page).changes.length, 0);
  assert.equal(planAreasContentRefresh(null).changes.length, 0);
  assert.throws(() => planAreasContentRefresh({ ...page, pageKey: 'home' }), /Only the Service Areas/);
});

test('Areas defaults remain valid with live fee and turnaround bindings, including zero', () => {
  assert.doesNotThrow(() => validatePageContent(defaults));
  const fee = entry(defaults, 'complimentary_doorstep_collection_on_orders_above_399_across_all__f9a4ff2').value;
  assert.equal(bindContentText(fee, { freeDeliveryThreshold: 0 }), 'On orders of ₹0 or more.');
  assert.equal(bindContentText(fee, { freeDeliveryThreshold: 499 }), 'On orders of ₹499 or more.');
  const delivery = entry(defaults, 'doorstep_pickup_48_hour_hub_delivery_42f5b6e').value;
  assert.match(bindContentText(delivery, {}, { 'home.turnaroundHours': 72 }), /72-hour delivery/);
  assert.equal(planAreasContentRefresh(defaults).changes.length, 0);
});

test('Areas refresh persists once and refuses stale plans', async t => {
  const { request } = await contentTestHarness(t);
  const original = await SiteContent.create(legacyPage());
  const unrelated = await SiteContent.create({ ...structuredClone(defaults), pageKey: 'pricing' });
  const plan = planAreasContentRefresh(await SiteContent.findById(original._id).lean());
  assert.equal(plan.changes.length, 4);
  assert.equal((await SiteContent.findById(original._id)).revision, 1, 'Planning must be read-only');
  assert.deepEqual(await applyAreasContentRefresh(plan), { changed: 4 });
  const saved = await SiteContent.findById(original._id).lean();
  assert.equal(saved.revision, 2);
  assert.equal(entry(saved, headingId).value, entry(defaults, headingId).value);
  assert.equal(saved.seo.description, defaults.seo.description);
  assert.equal((await request('/content/areas')).body.page.seo.title, defaults.seo.title);
  assert.deepEqual(await applyAreasContentRefresh(planAreasContentRefresh(saved)), { changed: 0 });
  assert.equal((await SiteContent.findById(original._id)).revision, 2);
  await assert.rejects(applyAreasContentRefresh(plan), /content changed/);
  assert.equal((await SiteContent.findById(unrelated._id)).revision, 1);
});
