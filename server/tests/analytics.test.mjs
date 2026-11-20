import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import PlatformConfig from '../models/PlatformConfig.js';
import ServiceArea from '../models/ServiceArea.js';
import TimeSlot from '../models/TimeSlot.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import AnalyticsSession from '../models/AnalyticsSession.js';
import AnalyticsVisitor from '../models/AnalyticsVisitor.js';

const browser = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' };
const visitorId = 'visitor_aaaaaaaaaaaa';
const sessionId = 'session_aaaaaaaaaaaa';
const context = { visitorId, sessionId, referrer: 'https://www.google.com/search?q=laundry', utm: { source: 'Instagram', campaign: 'Diwali' }, landingPath: '/' };
const now = () => Date.now();

test('website analytics: collection, attribution and admin report', async t => {
  const { request } = await contentTestHarness(t);

  await t.test('rejects missing ids and oversized batches', async () => {
    assert.equal((await request('/analytics/collect', { method: 'POST', headers: browser, body: { context: {}, events: [{ name: 'page_view' }] } })).status, 400);
    const big = Array.from({ length: 51 }, () => ({ name: 'click', path: '/' }));
    assert.equal((await request('/analytics/collect', { method: 'POST', headers: browser, body: { context, events: big } })).status, 413);
  });

  await t.test('drops bots, unknown and server-only event names, and personal properties', async () => {
    const bot = await request('/analytics/collect', { method: 'POST', headers: { 'User-Agent': 'Googlebot/2.1' }, body: { context: { ...context, visitorId: 'bot_visitor_000' }, events: [{ name: 'page_view', path: '/' }] } });
    assert.equal(bot.status, 202);
    assert.equal(await AnalyticsVisitor.countDocuments({ visitorId: 'bot_visitor_000' }), 0);

    const response = await request('/analytics/collect', { method: 'POST', headers: browser, body: { context, events: [
      { name: 'session_start', path: '/', ts: now() - 60000 },
      { name: 'page_view', path: '/?phone=9999999999#x', ts: now() - 59000 },
      { name: 'product_view', path: '/', props: { productId: 'g1', productName: 'Shirt', phone: '9999999999', email: 'a@b.c' }, ts: now() - 50000 },
      { name: 'order_placed', path: '/', props: { value: 1000000 } },
      { name: 'made_up_event', path: '/' },
    ] } });
    assert.equal(response.status, 202);
    assert.equal(response.body.accepted, 3);
    const view = await AnalyticsEvent.findOne({ name: 'product_view' }).lean();
    assert.equal(view.props.productName, 'Shirt');
    assert.equal(view.props.phone, undefined);
    assert.equal(view.props.email, undefined);
    assert.equal((await AnalyticsEvent.findOne({ name: 'page_view' }).lean()).path, '/');
    assert.equal(await AnalyticsEvent.countDocuments({ name: 'order_placed' }), 0);

    const session = await AnalyticsSession.findOne({ sessionId }).lean();
    assert.equal(session.referrer, 'google.com');
    assert.equal(session.utm.source, 'instagram');
    assert.equal(session.device.type, 'mobile');
    assert.equal(session.isNewVisitor, true);
    assert.equal(session.flags.productViewed, true);
  });

  await t.test('cart events and the server-side order join the browsing session', async () => {
    await PlatformConfig.create({ gstPercentage: 0 });
    const category = await Category.create({ name: 'Men' });
    const garment = await Garment.create({ name: 'Shirt', categoryId: category._id, category: category.name, pricing: testPrices });
    await ServiceArea.create({ name: 'Hub', slug: 'hub', pincodes: ['110001'] });
    await TimeSlot.create({ label: 'Morning', startHour: 8, endHour: 10 });

    await request('/analytics/collect', { method: 'POST', headers: browser, body: { context, events: [
      { name: 'page_view', path: '/book' },
      { name: 'search', path: '/book', props: { query: 'blazer', resultsCount: 0 } },
      { name: 'add_to_cart', path: '/book', props: { productId: String(garment._id), productName: 'Shirt', quantity: 2, value: 70, cartValue: 70, cartItems: 2 } },
      { name: 'begin_checkout', path: '/book', props: { cartValue: 70, cartItems: 2 } },
    ] } });

    const day = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const order = await request('/orders', { method: 'POST', role: 'customer', headers: { 'x-analytics-visitor': visitorId, 'x-analytics-session': sessionId }, body: {
      items: [{ garmentId: String(garment._id), quantity: 2, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' }],
      preferences: { detergentType: 'Standard', packagingType: 'Folded' },
      pickupAddress: { flatAndBuilding: '1 Test', streetAndLandmark: 'Test road', city: 'Test city', pincode: '110001', contactPhone: '9990000002' },
      pickupSchedule: { date: day(10), timeSlot: 'Morning' }, deliverySchedule: { date: day(12), timeSlot: 'Morning' }, paymentMethod: 'COD',
    } });
    assert.equal(order.status, 201, JSON.stringify(order.body));

    // The server event is written without blocking checkout; wait for it.
    for (let i = 0; i < 50 && !(await AnalyticsSession.exists({ sessionId, 'flags.placedOrder': true })); i += 1) await new Promise(resolve => setTimeout(resolve, 20));
    const placed = await AnalyticsEvent.findOne({ name: 'order_placed' }).lean();
    assert.equal(placed.sessionId, sessionId);
    assert.equal(placed.source, 'server');
    assert.equal(placed.props.value, order.body.order.pricingBreakdown.grandTotal);
    assert.equal(placed.props.cartItems, 2);
    const session = await AnalyticsSession.findOne({ sessionId }).lean();
    assert.equal(session.flags.placedOrder, true);
    assert.equal(session.flags.addedToCart, true);
    assert.equal(session.cartValue, 70);
  });

  await t.test('admin report and live view are admin-only and summarise the data', async () => {
    assert.equal((await request('/admin/analytics/report', { role: 'customer' })).status, 403);
    assert.equal((await request('/admin/analytics/report')).status, 401);
    const { status, body } = await request('/admin/analytics/report?days=7', { role: 'admin' });
    assert.equal(status, 200);
    const report = body.report;
    assert.equal(report.overview.visitors, 1);
    assert.equal(report.overview.sessions, 1);
    assert.equal(report.cart.funnel.find(step => step.step === 'Placed order').sessions, 1);
    assert.equal(report.cart.sessionConversionRate, 100);
    assert.equal(report.orders.orders, 1);
    assert.equal(report.behaviour.zeroResultSearches[0].query, 'blazer');
    assert.equal(report.products[0].unitsAdded, 2);
    assert.equal(report.acquisition.referrers[0].key, 'google.com');
    assert.ok(report.trend.length >= 7);
    assert.equal(report.retention.length, 8);

    const live = await request('/admin/analytics/live', { role: 'admin' });
    assert.equal(live.status, 200);
    assert.equal(live.body.live.activeVisitors, 1);
    assert.ok(live.body.live.recentEvents.length > 0);
  });
});
