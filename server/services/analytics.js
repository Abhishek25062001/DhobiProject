import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import AnalyticsSession from '../models/AnalyticsSession.js';
import AnalyticsVisitor from '../models/AnalyticsVisitor.js';
import { ANALYTICS_EVENTS as E, CLIENT_EVENTS, ANALYTICS_ID_PATTERN, VISITOR_HEADER, SESSION_HEADER } from '../../shared/analyticsEvents.mjs';

export const MAX_BATCH = 50;
const MAX_PROPS = 30;
const MAX_STRING = 200;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;

// Property names that could carry personal data. They are dropped, never stored.
const SENSITIVE_KEY = /(email|phone|mobile|password|otp|token|secret|address|pincode|card|upi|aadhaar|pan|name$)/i;
const SAFE_NAME_KEYS = new Set(['productName', 'categoryName', 'screenName', 'stepName']);
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|curl|wget|python-requests|axios\/|node-fetch|phantom|selenium|puppeteer|playwright/i;

export const validId = value => typeof value === 'string' && ANALYTICS_ID_PATTERN.test(value);
const clampString = value => String(value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, MAX_STRING);

export function cleanPath(value) {
  if (typeof value !== 'string') return '';
  // Keep the route only: query strings and fragments can carry personal data.
  const path = value.split(/[?#]/)[0].slice(0, 120);
  return path.startsWith('/') ? path : '';
}

export function referrerHost(value) {
  if (typeof value !== 'string' || !value) return '';
  try { return new URL(value).hostname.replace(/^www\./, '').slice(0, 100); } catch { return ''; }
}

function cleanUtm(utm) {
  if (!utm || typeof utm !== 'object') return undefined;
  const out = {};
  for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
    if (typeof utm[key] === 'string' && utm[key].trim()) out[key] = clampString(utm[key]).toLowerCase().slice(0, 80);
  }
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeProps(props, depth = 0) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {};
  const out = {};
  for (const [key, value] of Object.entries(props).slice(0, MAX_PROPS)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) continue;
    if (SENSITIVE_KEY.test(key) && !SAFE_NAME_KEYS.has(key)) continue;
    if (typeof value === 'number') { if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100; }
    else if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = clampString(value);
    else if (Array.isArray(value) && depth < 1) out[key] = value.slice(0, 20).map(item => (item && typeof item === 'object' ? sanitizeProps(item, depth + 1) : typeof item === 'string' ? clampString(item) : typeof item === 'number' && Number.isFinite(item) ? item : null)).filter(item => item !== null);
    else if (value && typeof value === 'object' && depth < 1) out[key] = sanitizeProps(value, depth + 1);
  }
  return out;
}

export function parseUserAgent(ua = '') {
  const s = String(ua);
  const isBot = !s || BOT_UA.test(s);
  const type = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s) ? 'tablet' : /Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(s) ? 'mobile' : 'desktop';
  const os = /Windows/i.test(s) ? 'Windows' : /iPhone|iPad|iPod/i.test(s) ? 'iOS' : /Android/i.test(s) ? 'Android' : /Mac OS X|Macintosh/i.test(s) ? 'macOS' : /CrOS/i.test(s) ? 'ChromeOS' : /Linux/i.test(s) ? 'Linux' : 'Other';
  const browser = /Edg\//i.test(s) ? 'Edge' : /OPR\/|Opera/i.test(s) ? 'Opera' : /SamsungBrowser/i.test(s) ? 'Samsung Internet' : /Firefox|FxiOS/i.test(s) ? 'Firefox' : /Chrome|CriOS/i.test(s) ? 'Chrome' : /Safari/i.test(s) ? 'Safari' : 'Other';
  return { isBot, type, os, browser };
}

function eventTime(value, now) {
  const ts = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ts) || ts > now + MAX_CLOCK_SKEW_MS || ts < now - MAX_EVENT_AGE_MS) return new Date(now);
  return new Date(Math.min(ts, now));
}

// Two batches from one browser can race to create the same visitor/session; the loser retries as an update.
async function retryDuplicate(operation) {
  try { return await operation(); } catch (error) { if (error?.code === 11000) return operation(); throw error; }
}

const asObjectId = value => (value && mongoose.isObjectIdOrHexString(String(value)) ? new mongoose.Types.ObjectId(String(value)) : null);

// Funnel flags raised by each event name.
const FLAG_FOR_EVENT = {
  [E.PRODUCT_VIEW]: 'productViewed',
  [E.SEARCH]: 'searched',
  [E.ADD_TO_CART]: 'addedToCart',
  [E.BEGIN_CHECKOUT]: 'beganCheckout',
  [E.PURCHASE]: 'placedOrder',
  [E.ORDER_PLACED]: 'placedOrder',
  [E.PAYMENT_CAPTURED]: 'paid',
};

/**
 * Validate and store a batch posted by the website tracker.
 * Returns { accepted, rejected } counts. Bots are silently accepted and dropped.
 */
export async function ingestBatch(body, { userAgent, userId } = {}) {
  const context = body?.context || {};
  const visitorId = context.visitorId;
  const sessionId = context.sessionId;
  if (!validId(visitorId) || !validId(sessionId)) throw Object.assign(new Error('A valid visitor and session id is required.'), { statusCode: 400 });
  const rawEvents = Array.isArray(body.events) ? body.events : [];
  if (!rawEvents.length) return { accepted: 0, rejected: 0 };
  if (rawEvents.length > MAX_BATCH) throw Object.assign(new Error(`At most ${MAX_BATCH} events per batch.`), { statusCode: 413 });

  const ua = parseUserAgent(userAgent);
  if (ua.isBot) return { accepted: 0, rejected: rawEvents.length, bot: true };

  const now = Date.now();
  const uid = asObjectId(userId);
  const docs = [];
  for (const raw of rawEvents) {
    if (!raw || typeof raw !== 'object' || !CLIENT_EVENTS.has(raw.name)) continue;
    docs.push({ name: raw.name, visitorId, sessionId, userId: uid, path: cleanPath(raw.path), props: sanitizeProps(raw.props), source: 'client', ts: eventTime(raw.ts, now) });
  }
  if (!docs.length) return { accepted: 0, rejected: rawEvents.length };
  docs.sort((a, b) => a.ts - b.ts);

  const first = docs[0].ts;
  const last = docs[docs.length - 1].ts;
  const pageViews = docs.filter(doc => doc.name === E.PAGE_VIEW);
  const sessionStart = docs.find(doc => doc.name === E.SESSION_START);
  const landing = cleanPath(context.landingPath) || pageViews[0]?.path || docs[0].path;
  const referrer = referrerHost(context.referrer);
  const utm = cleanUtm(context.utm);
  const device = { type: ua.type, os: ua.os, browser: ua.browser };

  // Visitor first: `null` back from an upsert with new:false means this browser is new.
  const previousVisitor = await retryDuplicate(() => AnalyticsVisitor.findOneAndUpdate(
    { visitorId },
    {
      $setOnInsert: { visitorId, firstSeenAt: first, firstReferrer: referrer, firstUtm: utm, firstPath: landing, device },
      $max: { lastSeenAt: last },
      ...(sessionStart ? { $inc: { sessionCount: 1 } } : {}),
      ...(uid ? { $set: { userId: uid } } : {}),
    },
    { upsert: true, new: false, setDefaultsOnInsert: true },
  ));

  const flags = {};
  for (const doc of docs) if (FLAG_FOR_EVENT[doc.name]) flags[`flags.${FLAG_FOR_EVENT[doc.name]}`] = true;
  const lastCart = [...docs].reverse().find(doc => typeof doc.props?.cartValue === 'number');
  const set = { ...flags };
  if (uid) set.userId = uid;
  if (pageViews.length) set.exitPath = pageViews[pageViews.length - 1].path;
  if (lastCart) { set.cartValue = lastCart.props.cartValue; set.cartItems = lastCart.props.cartItems || 0; }

  const screen = typeof context.screen === 'string' ? context.screen.slice(0, 20) : undefined;
  const language = typeof context.language === 'string' ? context.language.slice(0, 20) : undefined;
  const timezone = typeof context.timezone === 'string' ? context.timezone.slice(0, 50) : undefined;

  await retryDuplicate(() => AnalyticsSession.updateOne(
    { sessionId },
    {
      $setOnInsert: { sessionId, visitorId, entryPath: landing, referrer, utm, isNewVisitor: !previousVisitor, device: { ...device, screen, language, timezone } },
      $min: { startedAt: first },
      $max: { lastSeenAt: last },
      $inc: { pageViews: pageViews.length, events: docs.length },
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(pageViews.length ? { $push: { pages: { $each: pageViews.map(doc => doc.path), $slice: 50 } } } : {}),
    },
    { upsert: true },
  ));

  await AnalyticsEvent.insertMany(docs, { ordered: false });
  return { accepted: docs.length, rejected: rawEvents.length - docs.length };
}

/** Read the analytics ids the website attaches to every API request. */
export function analyticsContext(req) {
  const visitorId = req.get?.(VISITOR_HEADER);
  const sessionId = req.get?.(SESSION_HEADER);
  return { visitorId: validId(visitorId) ? visitorId : null, sessionId: validId(sessionId) ? sessionId : null };
}

/**
 * Record an authoritative server-side event (order placed, payment captured).
 * Analytics must never break checkout, so this never throws.
 */
export async function recordServerEvent(name, { visitorId = null, sessionId = null, userId = null, path = '', props = {} } = {}) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    let ids = { visitorId, sessionId };
    // Webhooks have no browser context: join back to the session that placed the order.
    if ((!ids.visitorId || !ids.sessionId) && props.orderId) {
      const placed = await AnalyticsEvent.findOne({ name: E.ORDER_PLACED, 'props.orderId': String(props.orderId) }, { visitorId: 1, sessionId: 1 }).lean();
      if (placed) ids = { visitorId: ids.visitorId || placed.visitorId, sessionId: ids.sessionId || placed.sessionId };
    }
    const uid = asObjectId(userId);
    const ts = new Date();
    await AnalyticsEvent.create({ name, ...ids, userId: uid, path, props: sanitizeProps(props), source: 'server', ts });
    const flag = FLAG_FOR_EVENT[name];
    if (ids.sessionId && flag) {
      const update = { $set: { [`flags.${flag}`]: true, ...(uid ? { userId: uid } : {}) }, $max: { lastSeenAt: ts } };
      if (name === E.ORDER_PLACED && typeof props.value === 'number') update.$inc = { orderValue: props.value };
      await AnalyticsSession.updateOne({ sessionId: ids.sessionId }, update);
    }
    if (ids.visitorId && name === E.ORDER_PLACED) {
      await AnalyticsVisitor.updateOne({ visitorId: ids.visitorId }, { $inc: { orders: 1, revenue: Number(props.value) || 0 }, ...(uid ? { $set: { userId: uid } } : {}) });
    }
  } catch (error) {
    console.error(JSON.stringify({ event: 'analytics_server_event_failed', name, error: error.message }));
  }
}
