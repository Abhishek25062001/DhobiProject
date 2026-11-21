import mongoose from 'mongoose';
import SavedBag from '../models/SavedBag.js';
import BagReminderLog from '../models/BagReminderLog.js';
import Garment from '../models/Garment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { calculateItemUnitPrice } from '../../shared/pricing.mjs';
import { ANALYTICS_EVENTS } from '../../shared/analyticsEvents.mjs';
import { recordServerEvent } from './analytics.js';

const MINUTE = 60000;
const DAY = 86400000;
const MAX_LINES = 100;
const SERVICE_PATTERN = /^[A-Z_]{2,40}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

const enabled = () => process.env.BAG_REMINDER_ENABLED !== 'false';
const reminderDelayMs = () => Math.min(7 * 24 * 60, Math.max(15, Number(process.env.BAG_REMINDER_DELAY_MINUTES) || 120)) * MINUTE;
// Bags older than this are stale: no reminder is sent, and later orders don't count as recovered.
export const RECOVERY_WINDOW_MS = 7 * DAY;
export const REMINDER_LINK = '/book?utm_source=bag_reminder&utm_medium=in_app&utm_campaign=abandoned_bag';
const round = value => Math.round((Number(value) || 0) * 100) / 100;

// ----- Saved bag -----

/** Validate a bag sent by the website and price it from the current catalogue. */
export async function normalizeBag(rawItems) {
  if (!Array.isArray(rawItems)) throw Object.assign(new Error('Bag items must be a list.'), { statusCode: 400 });
  if (rawItems.length > MAX_LINES) throw Object.assign(new Error(`A bag can hold at most ${MAX_LINES} lines.`), { statusCode: 400 });
  const candidates = rawItems.filter(item => item && mongoose.isObjectIdOrHexString(String(item.garmentId)) && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999 && SERVICE_PATTERN.test(item.serviceType || '') && SERVICE_PATTERN.test(item.ironingType || 'NONE'));
  const garments = await Garment.find({ _id: { $in: candidates.map(item => String(item.garmentId)) }, isActive: { $ne: false } }).lean();
  const byId = new Map(garments.map(garment => [String(garment._id), garment]));
  const items = [];
  let cartValue = 0;
  let cartItems = 0;
  for (const item of candidates) {
    const garment = byId.get(String(item.garmentId));
    if (!garment) continue;
    const isCustomItem = Boolean(item.isCustomItem || garment.isCustom);
    const ironingType = item.ironingType || 'NONE';
    items.push({
      cartItemId: typeof item.cartItemId === 'string' && ID_PATTERN.test(item.cartItemId) ? item.cartItemId : '',
      garmentId: garment._id,
      quantity: item.quantity,
      serviceType: item.serviceType,
      ironingType,
      isCustomItem,
      customDescription: isCustomItem ? String(item.customDescription || '').trim().slice(0, 200) : '',
    });
    cartValue += (calculateItemUnitPrice(garment, item.serviceType, ironingType) || 0) * item.quantity;
    cartItems += item.quantity;
  }
  return { items, cartValue: round(cartValue), cartItems };
}

export async function getSavedBag(userId) {
  return SavedBag.findOne({ user: userId }, { items: 1, cartValue: 1, cartItems: 1, lastActivityAt: 1, updatedAt: 1 }).lean();
}

export async function saveBag(userId, rawItems, now = new Date()) {
  const bag = await normalizeBag(rawItems);
  const update = { $set: { ...bag, lastActivityAt: now } };
  // An emptied bag starts over: the next bag may get its own reminder.
  if (!bag.items.length) update.$set.reminder = { sentAt: null, logId: null };
  return SavedBag.findOneAndUpdate({ user: userId }, update, { upsert: true, new: true, setDefaultsOnInsert: true, projection: { items: 1, cartValue: 1, cartItems: 1, lastActivityAt: 1, updatedAt: 1 } }).lean();
}

/**
 * Called after an order is placed: empties the saved bag and, when the customer had been
 * reminded within the recovery window, records the reminder as recovered. Never throws.
 */
export async function bagConvertedToOrder(userId, order, now = new Date()) {
  try {
    await SavedBag.updateOne({ user: userId }, { $set: { items: [], cartValue: 0, cartItems: 0, lastActivityAt: now, reminder: { sentAt: null, logId: null } } });
    const value = order?.pricingBreakdown?.grandTotal || 0;
    const log = await BagReminderLog.findOneAndUpdate(
      { user: userId, recoveredAt: null, sentAt: { $gte: new Date(now.getTime() - RECOVERY_WINDOW_MS), $lte: now } },
      { $set: { recoveredAt: now, orderId: order?._id || null, orderValue: value } },
      { sort: { sentAt: -1 }, new: true },
    );
    if (log) void recordServerEvent(ANALYTICS_EVENTS.BAG_RECOVERED, { userId, props: { orderId: String(order?._id || ''), value, hoursAfterReminder: round((now - log.sentAt) / 3600000) } });
  } catch (error) {
    console.error(JSON.stringify({ event: 'bag_conversion_failed', error: error.message }));
  }
}

// ----- Reminder channels -----

const formatRupees = value => `₹${Math.round(value).toLocaleString('en-IN')}`;
export function reminderCopy(bag) {
  const pieces = `${bag.cartItems} ${bag.cartItems === 1 ? 'piece' : 'pieces'}`;
  return {
    title: 'Your laundry bag is waiting',
    message: `You left ${pieces}${bag.cartValue ? ` (${formatRupees(bag.cartValue)})` : ''} in your bag. Pick a pickup slot and we'll collect them from your door.`,
  };
}

// Each sender receives { user, bag, copy, link } and resolves truthy when the message was delivered.
// Add WhatsApp/SMS/email by registering a sender and listing it in BAG_REMINDER_CHANNELS.
const senders = new Map([
  ['in_app', async ({ user, copy, link }) => Boolean(await Notification.createNotification({ recipient: user._id, type: 'BAG_REMINDER', title: copy.title, message: copy.message, link }))],
]);
export function registerBagReminderSender(name, send) { senders.set(name, send); }
const configuredChannels = () => (process.env.BAG_REMINDER_CHANNELS || 'in_app').split(',').map(name => name.trim()).filter(name => senders.has(name));

/** Send one reminder for every bag idle past the delay. Safe to run on several servers at once. */
export async function runBagReminders({ now = new Date(), limit = 100, log = console.log } = {}) {
  if (!enabled()) return { sent: 0, skipped: 0 };
  const channels = configuredChannels();
  if (!channels.length) return { sent: 0, skipped: 0 };
  const candidates = await SavedBag.find({
    'items.0': { $exists: true },
    'reminder.sentAt': null,
    lastActivityAt: { $lte: new Date(now.getTime() - reminderDelayMs()), $gte: new Date(now.getTime() - RECOVERY_WINDOW_MS) },
  }).sort({ lastActivityAt: 1 }).limit(limit).lean();

  let sent = 0;
  let skipped = 0;
  for (const bag of candidates) {
    const user = await User.findById(bag.user, { role: 1, isActive: 1 }).lean();
    // The customer may have ordered from another device without the bag being cleared.
    const orderedSince = user && await Order.exists({ customer: bag.user, createdAt: { $gte: bag.lastActivityAt } });
    const eligible = user && user.isActive !== false && (user.role || 'customer') === 'customer' && !orderedSince;
    // Claim the bag before sending so a concurrent run cannot remind twice.
    const claimed = await SavedBag.findOneAndUpdate({ _id: bag._id, 'reminder.sentAt': null, lastActivityAt: bag.lastActivityAt }, { $set: { 'reminder.sentAt': now } }, { new: true });
    if (!claimed) continue;
    if (!eligible) { skipped += 1; continue; }

    const copy = reminderCopy(bag);
    const delivered = [];
    for (const name of channels) {
      try { if (await senders.get(name)({ user, bag, copy, link: REMINDER_LINK })) delivered.push(name); }
      catch (error) { log(JSON.stringify({ event: 'bag_reminder_channel_failed', channel: name, error: error.message })); }
    }
    if (!delivered.length) {
      // Nothing went out: release the claim so the next run retries.
      await SavedBag.updateOne({ _id: bag._id, 'reminder.sentAt': now }, { $set: { 'reminder.sentAt': null } });
      continue;
    }
    const entry = await BagReminderLog.create({ user: bag.user, sentAt: now, channels: delivered, cartValue: bag.cartValue, cartItems: bag.cartItems });
    await SavedBag.updateOne({ _id: bag._id }, { $set: { 'reminder.logId': entry._id } });
    void recordServerEvent(ANALYTICS_EVENTS.BAG_REMINDER_SENT, { userId: bag.user, props: { cartValue: bag.cartValue, cartItems: bag.cartItems, channels: delivered.join(','), idleHours: round((now - bag.lastActivityAt) / 3600000) } });
    sent += 1;
  }
  if (sent || skipped) log(JSON.stringify({ event: 'bag_reminders', sent, skipped }));
  return { sent, skipped };
}

export function startBagReminders(options = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runBagReminders(options); }
    catch (error) { console.error(JSON.stringify({ event: 'bag_reminders_failed', error: error.message })); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 10 * MINUTE);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}

/** Reminder and recovery totals for the analytics report. */
export async function bagRecoveryReport(start, end) {
  const [row = {}] = await BagReminderLog.aggregate([
    { $match: { sentAt: { $gte: start, $lt: end } } },
    { $group: {
      _id: null,
      sent: { $sum: 1 },
      remindedValue: { $sum: '$cartValue' },
      recovered: { $sum: { $cond: [{ $ne: ['$recoveredAt', null] }, 1, 0] } },
      recoveredRevenue: { $sum: { $cond: [{ $ne: ['$recoveredAt', null] }, '$orderValue', 0] } },
      hoursToRecover: { $avg: { $cond: [{ $ne: ['$recoveredAt', null] }, { $divide: [{ $subtract: ['$recoveredAt', '$sentAt'] }, 3600000] }, null] } },
    } },
  ]);
  const waiting = await SavedBag.countDocuments({ 'items.0': { $exists: true }, 'reminder.sentAt': null, lastActivityAt: { $gte: new Date(Date.now() - RECOVERY_WINDOW_MS) } });
  const sent = row.sent || 0;
  return {
    remindersSent: sent,
    remindedValue: round(row.remindedValue),
    recoveredBags: row.recovered || 0,
    recoveredRevenue: round(row.recoveredRevenue),
    recoveryRate: sent ? Math.round(((row.recovered || 0) / sent) * 1000) / 10 : 0,
    avgHoursToRecover: round(row.hoursToRecover),
    savedBagsOpen: waiting,
    reminderDelayMinutes: reminderDelayMs() / MINUTE,
    enabled: enabled(),
    channels: configuredChannels(),
  };
}
