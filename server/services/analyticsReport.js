import AnalyticsEvent from '../models/AnalyticsEvent.js';
import AnalyticsSession from '../models/AnalyticsSession.js';
import AnalyticsVisitor from '../models/AnalyticsVisitor.js';
import Order from '../models/Order.js';
import { bagRecoveryReport } from './bagRecovery.js';
import { ANALYTICS_EVENTS as E } from '../../shared/analyticsEvents.mjs';

const TZ = process.env.ANALYTICS_TIMEZONE || 'Asia/Kolkata';
const DAY = 86400000;
const BOUNCE_MS = 10000;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const round = value => Math.round((value || 0) * 100) / 100;

export function reportRange({ days, from, to } = {}) {
  const end = to && !Number.isNaN(Date.parse(to)) ? new Date(to) : new Date();
  const span = Math.min(366, Math.max(1, Number(days) || 30));
  const start = from && !Number.isNaN(Date.parse(from)) ? new Date(from) : new Date(end.getTime() - span * DAY);
  if (start >= end) throw Object.assign(new Error('The start of the range must be before its end.'), { statusCode: 400 });
  return { start, end };
}

const durationExpr = { $subtract: ['$lastSeenAt', '$startedAt'] };
const dayKey = field => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } });

async function overview(match) {
  const [row = {}] = await AnalyticsSession.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      sessions: { $sum: 1 },
      visitors: { $addToSet: '$visitorId' },
      newVisitors: { $addToSet: { $cond: ['$isNewVisitor', '$visitorId', '$$REMOVE'] } },
      loggedIn: { $addToSet: { $cond: [{ $ne: ['$userId', null] }, '$visitorId', '$$REMOVE'] } },
      pageViews: { $sum: '$pageViews' },
      totalDuration: { $sum: durationExpr },
      bounces: { $sum: { $cond: [{ $and: [{ $lte: ['$pageViews', 1] }, { $lt: [durationExpr, BOUNCE_MS] }] }, 1, 0] } },
    } },
    { $project: { _id: 0, sessions: 1, pageViews: 1, totalDuration: 1, bounces: 1, visitors: { $size: '$visitors' }, newVisitors: { $size: '$newVisitors' }, loggedIn: { $size: '$loggedIn' } } },
  ]);
  const sessions = row.sessions || 0;
  const visitors = row.visitors || 0;
  return {
    visitors,
    newVisitors: row.newVisitors || 0,
    returningVisitors: Math.max(0, visitors - (row.newVisitors || 0)),
    loggedInVisitors: row.loggedIn || 0,
    sessions,
    pageViews: row.pageViews || 0,
    avgSessionSeconds: sessions ? Math.round(row.totalDuration / sessions / 1000) : 0,
    pagesPerSession: sessions ? round(row.pageViews / sessions) : 0,
    sessionsPerVisitor: visitors ? round(sessions / visitors) : 0,
    bounceRate: pct(row.bounces || 0, sessions),
  };
}

async function daily(match, start, end) {
  const [sessions, orders] = await Promise.all([
    AnalyticsSession.aggregate([
      { $match: match },
      { $group: { _id: dayKey('$startedAt'), sessions: { $sum: 1 }, visitors: { $addToSet: '$visitorId' }, pageViews: { $sum: '$pageViews' }, carts: { $sum: { $cond: ['$flags.addedToCart', 1, 0] } }, conversions: { $sum: { $cond: ['$flags.placedOrder', 1, 0] } } } },
      { $project: { sessions: 1, pageViews: 1, carts: 1, conversions: 1, visitors: { $size: '$visitors' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: dayKey('$createdAt'), orders: { $sum: 1 }, revenue: { $sum: '$pricingBreakdown.grandTotal' } } },
    ]),
  ]);
  const byDay = new Map();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let t = start.getTime(); t < end.getTime() + DAY; t += DAY) {
    const key = fmt.format(new Date(Math.min(t, end.getTime())));
    if (!byDay.has(key)) byDay.set(key, { date: key, visitors: 0, sessions: 0, pageViews: 0, carts: 0, conversions: 0, orders: 0, revenue: 0 });
  }
  for (const row of sessions) Object.assign(byDay.get(row._id) || byDay.set(row._id, { date: row._id, orders: 0, revenue: 0 }).get(row._id), { visitors: row.visitors, sessions: row.sessions, pageViews: row.pageViews, carts: row.carts, conversions: row.conversions });
  for (const row of orders) Object.assign(byDay.get(row._id) || byDay.set(row._id, { date: row._id, visitors: 0, sessions: 0, pageViews: 0, carts: 0, conversions: 0 }).get(row._id), { orders: row.orders, revenue: round(row.revenue) });
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function pages(range) {
  const [views, time] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { name: E.PAGE_VIEW, ts: range } },
      { $group: { _id: '$path', views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
      { $project: { _id: 0, path: '$_id', views: 1, visitors: { $size: '$visitors' } } },
      { $sort: { views: -1 } }, { $limit: 25 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { name: E.SCREEN_TIME, ts: range } },
      { $group: { _id: '$path', avgEngagedMs: { $avg: '$props.engagedMs' }, avgScroll: { $avg: '$props.scrollDepth' }, totalEngagedMs: { $sum: '$props.engagedMs' } } },
    ]),
  ]);
  const timeByPath = new Map(time.map(row => [row._id, row]));
  return views.map(row => {
    const t = timeByPath.get(row.path) || {};
    return { ...row, avgSeconds: Math.round((t.avgEngagedMs || 0) / 1000), avgScrollDepth: Math.round(t.avgScroll || 0), totalMinutes: Math.round((t.totalEngagedMs || 0) / 60000) };
  });
}

const topBy = (match, field, limit = 10) => AnalyticsSession.aggregate([
  { $match: match },
  { $group: { _id: { $ifNull: [field, ''] }, sessions: { $sum: 1 }, conversions: { $sum: { $cond: ['$flags.placedOrder', 1, 0] } } } },
  { $sort: { sessions: -1 } }, { $limit: limit },
  { $project: { _id: 0, key: { $cond: [{ $eq: ['$_id', ''] }, '(direct / none)', '$_id'] }, sessions: 1, conversions: 1 } },
]);

async function acquisition(match) {
  const [referrers, campaigns, devices, browsers, entryPages, exitPages] = await Promise.all([
    topBy(match, '$referrer'),
    topBy(match, { $concat: [{ $ifNull: ['$utm.source', ''] }, { $cond: [{ $ifNull: ['$utm.campaign', false] }, { $concat: [' / ', '$utm.campaign'] }, ''] }] }),
    topBy(match, '$device.type', 5),
    topBy(match, '$device.browser', 6),
    topBy(match, '$entryPath'),
    topBy(match, '$exitPath'),
  ]);
  return { referrers, campaigns, devices, browsers, entryPages, exitPages };
}

async function journeys(match) {
  const [paths, transitions] = await Promise.all([
    AnalyticsSession.aggregate([
      { $match: { ...match, 'pages.0': { $exists: true } } },
      { $project: { journey: { $slice: ['$pages', 5] }, converted: '$flags.placedOrder' } },
      { $group: { _id: '$journey', sessions: { $sum: 1 }, conversions: { $sum: { $cond: ['$converted', 1, 0] } } } },
      { $sort: { sessions: -1 } }, { $limit: 15 },
      { $project: { _id: 0, steps: '$_id', sessions: 1, conversions: 1 } },
    ]),
    AnalyticsSession.aggregate([
      { $match: { ...match, 'pages.1': { $exists: true } } },
      { $project: { pairs: { $map: { input: { $range: [0, { $subtract: [{ $size: '$pages' }, 1] }] }, as: 'i', in: { from: { $arrayElemAt: ['$pages', '$$i'] }, to: { $arrayElemAt: ['$pages', { $add: ['$$i', 1] }] } } } } } },
      { $unwind: '$pairs' },
      { $match: { $expr: { $ne: ['$pairs.from', '$pairs.to'] } } },
      { $group: { _id: '$pairs', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 15 },
      { $project: { _id: 0, from: '$_id.from', to: '$_id.to', count: 1 } },
    ]),
  ]);
  return { paths, transitions };
}

async function behaviour(range) {
  const [searches, zeroResultSearches, clicks, filters] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { name: E.SEARCH, ts: range } },
      { $group: { _id: { $toLower: '$props.query' }, searches: { $sum: 1 }, visitors: { $addToSet: '$visitorId' }, avgResults: { $avg: '$props.resultsCount' } } },
      { $sort: { searches: -1 } }, { $limit: 20 },
      { $project: { _id: 0, query: '$_id', searches: 1, visitors: { $size: '$visitors' }, avgResults: { $round: ['$avgResults', 1] } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { name: E.SEARCH, ts: range, 'props.resultsCount': 0 } },
      { $group: { _id: { $toLower: '$props.query' }, searches: { $sum: 1 } } },
      { $sort: { searches: -1 } }, { $limit: 10 },
      { $project: { _id: 0, query: '$_id', searches: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { name: E.CLICK, ts: range } },
      { $group: { _id: { label: '$props.label', path: '$path' }, clicks: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
      { $sort: { clicks: -1 } }, { $limit: 25 },
      { $project: { _id: 0, label: '$_id.label', path: '$_id.path', clicks: 1, visitors: { $size: '$visitors' } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { name: E.FILTER, ts: range } },
      { $group: { _id: '$props.value', uses: { $sum: 1 } } },
      { $sort: { uses: -1 } }, { $limit: 10 },
      { $project: { _id: 0, value: '$_id', uses: 1 } },
    ]),
  ]);
  return { searches, zeroResultSearches, clicks, filters };
}

async function products(range) {
  const rows = await AnalyticsEvent.aggregate([
    { $match: { name: { $in: [E.PRODUCT_VIEW, E.ADD_TO_CART, E.REMOVE_FROM_CART] }, ts: range, 'props.productId': { $exists: true } } },
    { $group: {
      _id: '$props.productId',
      name: { $last: '$props.productName' },
      views: { $sum: { $cond: [{ $eq: ['$name', E.PRODUCT_VIEW] }, 1, 0] } },
      viewers: { $addToSet: { $cond: [{ $eq: ['$name', E.PRODUCT_VIEW] }, '$sessionId', '$$REMOVE'] } },
      adders: { $addToSet: { $cond: [{ $eq: ['$name', E.ADD_TO_CART] }, '$sessionId', '$$REMOVE'] } },
      unitsAdded: { $sum: { $cond: [{ $eq: ['$name', E.ADD_TO_CART] }, { $ifNull: ['$props.quantity', 1] }, 0] } },
      unitsRemoved: { $sum: { $cond: [{ $eq: ['$name', E.REMOVE_FROM_CART] }, { $ifNull: ['$props.quantity', 1] }, 0] } },
      valueAdded: { $sum: { $cond: [{ $eq: ['$name', E.ADD_TO_CART] }, { $ifNull: ['$props.value', 0] }, 0] } },
    } },
    { $project: { _id: 0, productId: '$_id', name: 1, views: 1, unitsAdded: 1, unitsRemoved: 1, valueAdded: { $round: ['$valueAdded', 2] }, viewSessions: { $size: '$viewers' }, addSessions: { $size: '$adders' } } },
    { $sort: { unitsAdded: -1, views: -1 } }, { $limit: 25 },
  ]);
  return rows.map(row => ({ ...row, viewToCartRate: pct(row.addSessions, row.viewSessions) }));
}

async function cart(match, range) {
  const [[sessionRow = {}], [eventRow = {}]] = await Promise.all([
    AnalyticsSession.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        sessions: { $sum: 1 },
        productViewed: { $sum: { $cond: ['$flags.productViewed', 1, 0] } },
        searched: { $sum: { $cond: ['$flags.searched', 1, 0] } },
        addedToCart: { $sum: { $cond: ['$flags.addedToCart', 1, 0] } },
        beganCheckout: { $sum: { $cond: ['$flags.beganCheckout', 1, 0] } },
        placedOrder: { $sum: { $cond: ['$flags.placedOrder', 1, 0] } },
        paid: { $sum: { $cond: ['$flags.paid', 1, 0] } },
        cartsAbandoned: { $sum: { $cond: [{ $and: ['$flags.addedToCart', { $not: ['$flags.placedOrder'] }] }, 1, 0] } },
        abandonedValue: { $sum: { $cond: [{ $and: ['$flags.addedToCart', { $not: ['$flags.placedOrder'] }] }, '$cartValue', 0] } },
        checkoutsAbandoned: { $sum: { $cond: [{ $and: ['$flags.beganCheckout', { $not: ['$flags.placedOrder'] }] }, 1, 0] } },
        cartValueSum: { $sum: { $cond: ['$flags.addedToCart', '$cartValue', 0] } },
        cartItemsSum: { $sum: { $cond: ['$flags.addedToCart', '$cartItems', 0] } },
      } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ts: range, name: { $in: [E.ADD_TO_CART, E.REMOVE_FROM_CART, E.BEGIN_CHECKOUT, E.PLACE_ORDER_CLICK, E.ORDER_FAILED, E.PAYMENT_OPENED, E.PAYMENT_DISMISSED, E.CHECKOUT_LOGIN_REQUIRED, E.COUPON_APPLIED] } } },
      { $group: {
        _id: null,
        addEvents: { $sum: { $cond: [{ $eq: ['$name', E.ADD_TO_CART] }, 1, 0] } },
        removeEvents: { $sum: { $cond: [{ $eq: ['$name', E.REMOVE_FROM_CART] }, 1, 0] } },
        unitsAdded: { $sum: { $cond: [{ $eq: ['$name', E.ADD_TO_CART] }, { $ifNull: ['$props.quantity', 1] }, 0] } },
        unitsRemoved: { $sum: { $cond: [{ $eq: ['$name', E.REMOVE_FROM_CART] }, { $ifNull: ['$props.quantity', 1] }, 0] } },
        checkoutStarts: { $sum: { $cond: [{ $eq: ['$name', E.BEGIN_CHECKOUT] }, 1, 0] } },
        placeOrderClicks: { $sum: { $cond: [{ $eq: ['$name', E.PLACE_ORDER_CLICK] }, 1, 0] } },
        orderFailures: { $sum: { $cond: [{ $eq: ['$name', E.ORDER_FAILED] }, 1, 0] } },
        loginWalls: { $sum: { $cond: [{ $eq: ['$name', E.CHECKOUT_LOGIN_REQUIRED] }, 1, 0] } },
        paymentOpened: { $sum: { $cond: [{ $eq: ['$name', E.PAYMENT_OPENED] }, 1, 0] } },
        paymentDismissed: { $sum: { $cond: [{ $eq: ['$name', E.PAYMENT_DISMISSED] }, 1, 0] } },
        couponsApplied: { $sum: { $cond: [{ $eq: ['$name', E.COUPON_APPLIED] }, 1, 0] } },
      } },
    ]),
  ]);
  const s = sessionRow;
  const funnel = [
    { step: 'Visited', sessions: s.sessions || 0 },
    { step: 'Viewed a product', sessions: s.productViewed || 0 },
    { step: 'Added to bag', sessions: s.addedToCart || 0 },
    { step: 'Started checkout', sessions: s.beganCheckout || 0 },
    { step: 'Placed order', sessions: s.placedOrder || 0 },
  ].map((row, index, all) => ({ ...row, ofTotal: pct(row.sessions, all[0].sessions), ofPrevious: index ? pct(row.sessions, all[index - 1].sessions) : 100 }));
  return {
    funnel,
    sessionsWithCart: s.addedToCart || 0,
    avgCartValue: s.addedToCart ? round(s.cartValueSum / s.addedToCart) : 0,
    avgCartItems: s.addedToCart ? round(s.cartItemsSum / s.addedToCart) : 0,
    cartAbandonmentRate: pct(s.cartsAbandoned || 0, s.addedToCart || 0),
    abandonedCarts: s.cartsAbandoned || 0,
    abandonedCartValue: round(s.abandonedValue),
    checkoutAbandonmentRate: pct(s.checkoutsAbandoned || 0, s.beganCheckout || 0),
    abandonedCheckouts: s.checkoutsAbandoned || 0,
    sessionConversionRate: pct(s.placedOrder || 0, s.sessions || 0),
    cartToOrderRate: pct(s.placedOrder || 0, s.addedToCart || 0),
    paidSessions: s.paid || 0,
    events: { addEvents: 0, removeEvents: 0, unitsAdded: 0, unitsRemoved: 0, checkoutStarts: 0, placeOrderClicks: 0, orderFailures: 0, loginWalls: 0, paymentOpened: 0, paymentDismissed: 0, couponsApplied: 0, ...eventRow, _id: undefined },
  };
}

async function orderOutcomes(start, end, visitors) {
  const [row = {}] = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: {
      _id: null,
      orders: { $sum: 1 },
      revenue: { $sum: '$pricingBreakdown.grandTotal' },
      paidOrders: { $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, 1, 0] } },
      paidRevenue: { $sum: { $cond: [{ $eq: ['$payment.status', 'PAID'] }, '$pricingBreakdown.grandTotal', 0] } },
      cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] } },
      online: { $sum: { $cond: [{ $eq: ['$payment.method', 'ONLINE'] }, 1, 0] } },
      customers: { $addToSet: '$customer' },
    } },
  ]);
  const orders = row.orders || 0;
  return {
    orders,
    revenue: round(row.revenue),
    avgOrderValue: orders ? round(row.revenue / orders) : 0,
    paidOrders: row.paidOrders || 0,
    paidRevenue: round(row.paidRevenue),
    cancelledOrders: row.cancelled || 0,
    onlineShare: pct(row.online || 0, orders),
    uniqueCustomers: row.customers?.length || 0,
    visitorToOrderRate: pct(orders, visitors),
  };
}

// Weekly cohorts: of the visitors first seen in week N, what share came back in week N+k.
async function retention(now) {
  const weeks = 8;
  const weekMs = 7 * DAY;
  const origin = new Date(now.getTime() - weeks * weekMs);
  const rows = await AnalyticsVisitor.aggregate([
    { $match: { firstSeenAt: { $gte: origin } } },
    { $lookup: { from: AnalyticsSession.collection.name, localField: 'visitorId', foreignField: 'visitorId', as: 'sessions', pipeline: [{ $project: { _id: 0, startedAt: 1 } }] } },
    { $project: {
      cohort: { $floor: { $divide: [{ $subtract: ['$firstSeenAt', origin] }, weekMs] } },
      activeWeeks: { $setUnion: [{ $map: { input: '$sessions', as: 's', in: { $floor: { $divide: [{ $subtract: ['$$s.startedAt', '$firstSeenAt'] }, weekMs] } } } }, []] },
    } },
    { $unwind: '$activeWeeks' },
    { $group: { _id: { cohort: '$cohort', week: '$activeWeeks' }, visitors: { $sum: 1 } } },
  ]);
  const cohortSize = new Map();
  const cells = new Map();
  for (const { _id, visitors } of rows) {
    if (_id.week === 0) cohortSize.set(_id.cohort, visitors);
    cells.set(`${_id.cohort}:${_id.week}`, visitors);
  }
  return Array.from({ length: weeks }, (_, cohort) => {
    const size = cohortSize.get(cohort) || 0;
    const startDate = new Date(origin.getTime() + cohort * weekMs).toISOString().slice(0, 10);
    const maxWeek = weeks - 1 - cohort;
    return { cohort: startDate, visitors: size, weeks: Array.from({ length: maxWeek + 1 }, (_, week) => pct(cells.get(`${cohort}:${week}`) || 0, size)) };
  });
}

async function engagement(now) {
  const windowCount = since => AnalyticsSession.distinct('visitorId', { lastSeenAt: { $gte: new Date(now.getTime() - since) } }).then(ids => ids.length);
  const [dau, wau, mau] = await Promise.all([windowCount(DAY), windowCount(7 * DAY), windowCount(30 * DAY)]);
  return { dau, wau, mau, stickiness: pct(dau, mau) };
}

export async function buildReport(query = {}) {
  const { start, end } = reportRange(query);
  const now = new Date();
  const match = { startedAt: { $gte: start, $lt: end } };
  const range = { $gte: start, $lt: end };
  const summary = await overview(match);
  const [trend, topPages, sources, paths, behaviourData, productData, cartData, outcomes, cohorts, engaged, recovery] = await Promise.all([
    daily(match, start, end), pages(range), acquisition(match), journeys(match), behaviour(range), products(range), cart(match, range), orderOutcomes(start, end, summary.visitors), retention(now), engagement(now), bagRecoveryReport(start, end),
  ]);
  return { range: { start, end, timezone: TZ }, overview: summary, engagement: engaged, trend, pages: topPages, acquisition: sources, journeys: paths, behaviour: behaviourData, products: productData, cart: cartData, recovery, orders: outcomes, retention: cohorts };
}

export async function buildLive() {
  const since = new Date(Date.now() - 5 * 60000);
  const [active, recent] = await Promise.all([
    AnalyticsSession.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: '$exitPath', visitors: { $addToSet: '$visitorId' } } },
      { $project: { _id: 0, path: '$_id', visitors: { $size: '$visitors' } } },
      { $sort: { visitors: -1 } },
    ]),
    AnalyticsEvent.find({ name: { $nin: [E.SCREEN_TIME] } }, { _id: 0, name: 1, path: 1, props: 1, ts: 1, visitorId: 1, userId: 1, source: 1 }).sort({ ts: -1 }).limit(40).lean(),
  ]);
  return { activeVisitors: active.reduce((sum, row) => sum + row.visitors, 0), activePages: active, recentEvents: recent.map(event => ({ ...event, visitorId: event.visitorId ? event.visitorId.slice(0, 8) : null })) };
}
