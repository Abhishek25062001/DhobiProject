import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import PlatformConfig from '../models/PlatformConfig.js';
import ServiceArea from '../models/ServiceArea.js';
import TimeSlot from '../models/TimeSlot.js';
import SavedBag from '../models/SavedBag.js';
import BagReminderLog from '../models/BagReminderLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { runBagReminders, registerBagReminderSender, REMINDER_LINK } from '../services/bagRecovery.js';

const HOUR = 3600000;
const silent = () => {};

test('saved bag and abandoned-bag recovery', async t => {
  const { request } = await contentTestHarness(t);
  await PlatformConfig.create({ gstPercentage: 0 });
  const category = await Category.create({ name: 'Men' });
  const shirt = await Garment.create({ name: 'Shirt', categoryId: category._id, category: category.name, pricing: testPrices });
  const customer = await User.findOne({ role: 'customer' });
  const line = { garmentId: String(shirt._id), quantity: 3, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' };

  await t.test('the bag API is private, validates items and prices them from the catalogue', async () => {
    assert.equal((await request('/bag')).status, 401);
    assert.deepEqual((await request('/bag', { role: 'customer' })).body.bag.items, []);
    const saved = await request('/bag', { method: 'PUT', role: 'customer', body: { items: [line, { garmentId: 'not-an-id', quantity: 1, serviceType: 'WASH_AND_FOLD' }, { ...line, garmentId: String(category._id) }] } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.bag.items.length, 1);
    assert.equal(saved.body.bag.cartValue, testPrices.washOnly * 3);
    assert.equal(saved.body.bag.cartItems, 3);
    assert.equal((await request('/bag', { method: 'PUT', role: 'customer', body: { items: 'nope' } })).status, 400);
    assert.equal((await request('/bag', { role: 'customer' })).body.bag.items[0].quantity, 3);
  });

  await t.test('no reminder before the delay; exactly one reminder after it', async () => {
    const idleFor = ms => SavedBag.updateOne({ user: customer._id }, { $set: { lastActivityAt: new Date(Date.now() - ms) } });
    await idleFor(HOUR);
    assert.equal((await runBagReminders({ log: silent })).sent, 0);
    await idleFor(2 * HOUR + 60000);
    assert.equal((await runBagReminders({ log: silent })).sent, 1);
    assert.equal((await runBagReminders({ log: silent })).sent, 0);

    const notification = await Notification.findOne({ recipient: customer._id, type: 'BAG_REMINDER' }).lean();
    assert.equal(notification.link, REMINDER_LINK);
    assert.match(notification.message, /3 pieces/);
    const inbox = await request('/notifications', { role: 'customer' });
    assert.equal(inbox.body.data[0].link, REMINDER_LINK);
  });

  await t.test('staff bags and stale bags are never reminded; failed channels retry', async () => {
    const admin = await User.findOne({ role: 'admin' });
    await SavedBag.create({ user: admin._id, items: [line], cartItems: 3, lastActivityAt: new Date(Date.now() - 3 * HOUR) });
    const stale = await User.create({ name: 'Old', email: 'old@example.test', phone: '9990000003', password: 'isolated-test-password', role: 'customer' });
    await SavedBag.create({ user: stale._id, items: [line], cartItems: 3, lastActivityAt: new Date(Date.now() - 8 * 24 * HOUR) });
    assert.equal((await runBagReminders({ log: silent })).sent, 0);
    assert.equal(await Notification.countDocuments({ recipient: admin._id }), 0);
    assert.equal(await Notification.countDocuments({ recipient: stale._id }), 0);

    const flaky = await User.create({ name: 'Flaky', email: 'flaky@example.test', phone: '9990000004', password: 'isolated-test-password', role: 'customer' });
    await SavedBag.create({ user: flaky._id, items: [line], cartItems: 3, lastActivityAt: new Date(Date.now() - 3 * HOUR) });
    registerBagReminderSender('in_app', async () => { throw new Error('provider down'); });
    try {
      assert.equal((await runBagReminders({ log: silent })).sent, 0);
      assert.equal((await SavedBag.findOne({ user: flaky._id })).reminder.sentAt, null);
    } finally {
      registerBagReminderSender('in_app', async ({ user, copy, link }) => Boolean(await Notification.createNotification({ recipient: user._id, type: 'BAG_REMINDER', title: copy.title, message: copy.message, link })));
    }
    assert.equal((await runBagReminders({ log: silent })).sent, 1);
  });

  await t.test('placing an order empties the saved bag and counts the reminder as recovered', async () => {
    await ServiceArea.create({ name: 'Hub', slug: 'hub', pincodes: ['110001'] });
    await TimeSlot.create({ label: 'Morning', startHour: 8, endHour: 10 });
    const day = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const order = await request('/orders', { method: 'POST', role: 'customer', body: {
      items: [{ ...line }], preferences: { detergentType: 'Standard', packagingType: 'Folded' },
      pickupAddress: { flatAndBuilding: '1 Test', streetAndLandmark: 'Test road', city: 'Test city', pincode: '110001', contactPhone: '9990000002' },
      pickupSchedule: { date: day(10), timeSlot: 'Morning' }, deliverySchedule: { date: day(12), timeSlot: 'Morning' }, paymentMethod: 'COD',
    } });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    for (let i = 0; i < 50 && !(await BagReminderLog.exists({ user: customer._id, recoveredAt: { $ne: null } })); i += 1) await new Promise(resolve => setTimeout(resolve, 20));
    const log = await BagReminderLog.findOne({ user: customer._id }).lean();
    assert.ok(log.recoveredAt);
    assert.equal(log.orderValue, order.body.order.pricingBreakdown.grandTotal);
    const bag = await SavedBag.findOne({ user: customer._id }).lean();
    assert.equal(bag.items.length, 0);
    assert.equal(bag.reminder.sentAt, null);

    const report = (await request('/admin/analytics/report?days=30', { role: 'admin' })).body.report.recovery;
    assert.equal(report.remindersSent, 2);
    assert.equal(report.recoveredBags, 1);
    assert.equal(report.recoveryRate, 50);
    assert.equal(report.recoveredRevenue, order.body.order.pricingBreakdown.grandTotal);
  });
});
