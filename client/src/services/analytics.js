// First-party website analytics tracker.
//
// - Visitor id: random id in localStorage (one per browser), so returning visitors are recognised.
// - Session id: rotates after 30 minutes without activity, or when the tab arrives from a new campaign.
// - Events are queued and sent in batches every few seconds, and flushed with `keepalive`
//   when the tab is hidden or closed, so the last screen of a visit is not lost.
// - No personal data is collected: no names, phone numbers, addresses, form values or query strings.
//   Visitors can opt out with `window.indodhobiAnalytics.optOut()`; Global Privacy Control is honoured.

import { ANALYTICS_EVENTS as E, SESSION_TIMEOUT_MS, VISITOR_HEADER, SESSION_HEADER } from '../../../shared/analyticsEvents.mjs';

const ENDPOINT = '/api/analytics/collect';
const VISITOR_KEY = 'indodhobi_vid';
const SESSION_KEY = 'indodhobi_sid';
const OPT_OUT_KEY = 'indodhobi_analytics_optout';
const FLUSH_INTERVAL_MS = 8000;
const MAX_BATCH = 40;
const MAX_QUEUE = 500;
const ENGAGEMENT_IDLE_MS = 30000; // engaged time stops counting after 30s without input

const storage = {
  get(store, key) { try { return window[store].getItem(key); } catch { return null; } },
  set(store, key, value) { try { window[store].setItem(key, value); } catch { /* storage blocked */ } },
  remove(store, key) { try { window[store].removeItem(key); } catch { /* storage blocked */ } },
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
// Staff dashboards are internal tools; tracking them would distort customer analytics.
const STAFF_PATH = /^\/(admin|rider)(\/|$)/;
const disabled = () => !isBrowser || STAFF_PATH.test(window.location.pathname) || import.meta.env?.VITE_ANALYTICS_DISABLED === 'true' || storage.get('localStorage', OPT_OUT_KEY) === '1' || navigator.globalPrivacyControl === true;

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 80);
  }
  if (!utm.source && params.get('gclid')) Object.assign(utm, { source: 'google', medium: 'cpc' });
  if (!utm.source && params.get('fbclid')) Object.assign(utm, { source: 'facebook', medium: 'social' });
  return Object.keys(utm).length ? utm : null;
}

function externalReferrer() {
  try {
    if (!document.referrer) return '';
    return new URL(document.referrer).host === window.location.host ? '' : document.referrer;
  } catch { return ''; }
}

const state = {
  started: false,
  visitorId: null,
  session: null, // { id, lastActivity, referrer, utm, landingPath }
  queue: [],
  timer: null,
  screen: null, // { path, enteredAt, engagedMs, lastTick, lastInput, maxScroll }
  viewCount: 0, // increments on every screen view; scopes "once per screen" events
};

function loadVisitorId() {
  let id = storage.get('localStorage', VISITOR_KEY);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId();
    storage.set('localStorage', VISITOR_KEY, id);
  }
  return id;
}

function saveSession() {
  storage.set('localStorage', SESSION_KEY, JSON.stringify(state.session));
}

// Returns the current session, starting a new one when the previous one timed out
// or the visitor arrived from a new campaign link.
function ensureSession() {
  const now = Date.now();
  if (!state.session) {
    try { state.session = JSON.parse(storage.get('localStorage', SESSION_KEY) || 'null'); } catch { state.session = null; }
  }
  const utm = readUtm();
  const expired = !state.session?.id || now - (state.session.lastActivity || 0) > SESSION_TIMEOUT_MS;
  const newCampaign = utm && JSON.stringify(utm) !== JSON.stringify(state.session?.utm || null);
  if (expired || newCampaign) {
    state.session = { id: randomId(), lastActivity: now, startedAt: now, referrer: externalReferrer(), utm, landingPath: window.location.pathname };
    saveSession();
    enqueue(E.SESSION_START, { landingPath: window.location.pathname, hasReferrer: Boolean(state.session.referrer), hasCampaign: Boolean(utm) });
  } else {
    state.session.lastActivity = now;
    saveSession();
  }
  return state.session;
}

function context() {
  const session = state.session || {};
  return {
    visitorId: state.visitorId,
    sessionId: session.id,
    referrer: session.referrer || '',
    utm: session.utm || undefined,
    landingPath: session.landingPath || '',
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
}

function enqueue(name, props = {}, path = window.location.pathname) {
  if (state.queue.length >= MAX_QUEUE) state.queue.shift();
  state.queue.push({ name, props, path, ts: Date.now() });
  if (state.queue.length >= MAX_BATCH) flush();
}

function send(events, { keepalive = false } = {}) {
  const body = JSON.stringify({ context: context(), events });
  return fetch(ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    keepalive,
    headers: { 'Content-Type': 'application/json', 'X-Session-Mode': 'cookie', 'X-CSRF-Protection': '1' },
    body,
  });
}

export function flush({ keepalive = false } = {}) {
  if (disabled() || !state.started || !state.queue.length) return;
  const batch = state.queue.splice(0, MAX_BATCH);
  send(batch, { keepalive }).then(response => {
    // Retry later when the API is starting or rate limited; drop batches it rejected as invalid.
    if (response.status === 429 || response.status >= 500) state.queue.unshift(...batch.slice(0, MAX_QUEUE - state.queue.length));
  }).catch(() => {
    state.queue.unshift(...batch.slice(0, MAX_QUEUE - state.queue.length));
  });
  if (state.queue.length) flush({ keepalive });
}

// ----- Screen time & scroll depth -----

function scrollDepth() {
  const doc = document.documentElement;
  const scrollable = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0) - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.round((window.scrollY / scrollable) * 100));
}

function tickEngagement(now = Date.now()) {
  const screen = state.screen;
  if (!screen) return;
  if (document.visibilityState === 'visible' && now - screen.lastInput < ENGAGEMENT_IDLE_MS) {
    screen.engagedMs += Math.max(0, now - screen.lastTick);
  }
  screen.lastTick = now;
}

function endScreen() {
  const screen = state.screen;
  if (!screen) return;
  tickEngagement();
  enqueue(E.SCREEN_TIME, { engagedMs: Math.round(screen.engagedMs), totalMs: Date.now() - screen.enteredAt, scrollDepth: screen.maxScroll }, screen.path);
  state.screen = null;
}

function noteActivity() {
  if (!state.screen) return;
  tickEngagement();
  state.screen.lastInput = Date.now();
  if (state.session) {
    // Keep the session alive while the visitor is active, without starting a new one mid-screen.
    state.session.lastActivity = Date.now();
  }
}

function onScroll() {
  noteActivity();
  if (state.screen) state.screen.maxScroll = Math.max(state.screen.maxScroll, scrollDepth());
}

// ----- Click autocapture -----

const MAX_LABEL = 60;
function clickLabel(element) {
  const explicit = element.getAttribute('data-track');
  if (explicit) return explicit.slice(0, MAX_LABEL);
  const aria = element.getAttribute('aria-label') || element.getAttribute('title');
  const text = (aria || element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
  // Digits are masked so prices, order numbers or OTPs shown on buttons are not collected.
  return text.replace(/\d/g, '#').slice(0, MAX_LABEL) || element.tagName.toLowerCase();
}

function onClick(event) {
  noteActivity();
  const element = event.target?.closest?.('a, button, [role="button"], [data-track]');
  if (!element || element.closest('[data-track-ignore]')) return;
  const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';
  let destination = '';
  let outbound = false;
  if (href) {
    try {
      const url = new URL(href, window.location.href);
      outbound = url.host !== window.location.host;
      destination = outbound ? url.host : url.pathname;
    } catch { /* ignore malformed href */ }
    if (/^(tel|mailto|https?:\/\/wa\.me|whatsapp):?/i.test(href)) destination = href.split(':')[0];
  }
  track(E.CLICK, { label: clickLabel(element), element: element.tagName.toLowerCase(), ...(destination ? { destination } : {}), ...(outbound ? { outbound: true } : {}) });
}

// ----- Public API -----

export function initAnalytics() {
  if (state.started || disabled()) return;
  state.started = true;
  state.visitorId = loadVisitorId();
  ensureSession();

  state.timer = window.setInterval(() => { tickEngagement(); flush(); }, FLUSH_INTERVAL_MS);
  const passive = { passive: true, capture: true };
  document.addEventListener('click', onClick, true);
  window.addEventListener('scroll', onScroll, passive);
  for (const type of ['keydown', 'pointerdown', 'touchstart', 'mousemove']) window.addEventListener(type, noteActivity, passive);
  document.addEventListener('visibilitychange', () => {
    tickEngagement();
    if (document.visibilityState === 'hidden') {
      if (state.session) { state.session.lastActivity = Date.now(); saveSession(); }
      flush({ keepalive: true });
    } else if (state.screen) {
      state.screen.lastTick = Date.now();
      state.screen.lastInput = Date.now();
      // Returning after 30+ minutes counts as a new session, starting from the current screen.
      const previous = state.session?.id;
      if (ensureSession().id !== previous) enqueue(E.PAGE_VIEW, { title: document.title.slice(0, 80), resumed: true });
    }
  });
  window.addEventListener('pagehide', () => { endScreen(); flush({ keepalive: true }); });

  window.indodhobiAnalytics = {
    optOut() { storage.set('localStorage', OPT_OUT_KEY, '1'); state.queue = []; },
    optIn() { storage.remove('localStorage', OPT_OUT_KEY); },
    visitorId: () => state.visitorId,
  };
}

/** Record a screen view. Call on every route change. */
export function trackPageView(path = window.location.pathname) {
  if (!state.started) initAnalytics(); // the first screen may have been a staff dashboard
  if (disabled() || !state.started) { endScreen(); return; }
  if (state.screen?.path === path) return;
  endScreen();
  ensureSession();
  const now = Date.now();
  state.screen = { path, enteredAt: now, engagedMs: 0, lastTick: now, lastInput: now, maxScroll: 0 };
  state.viewCount += 1;
  enqueue(E.PAGE_VIEW, { title: document.title.slice(0, 80) }, path);
  window.setTimeout(() => { if (state.screen?.path === path) state.screen.maxScroll = Math.max(state.screen.maxScroll, scrollDepth()); }, 1000);
}

/** Record a named event with non-personal properties. */
export function track(name, props = {}) {
  if (disabled() || !state.started) return;
  ensureSession();
  enqueue(name, props);
}

/** Link the anonymous visitor to a signed-in account (the server reads the id from the session cookie). */
export function identify(userId, props = {}) {
  if (disabled() || !state.started || !userId) return;
  const key = `indodhobi_identified_${state.session?.id}`;
  if (storage.get('sessionStorage', key) === String(userId)) return;
  storage.set('sessionStorage', key, String(userId));
  track(E.IDENTIFY, props);
  flush();
}

/** Identifier of the current screen view, used to de-duplicate impressions. */
export const currentViewId = () => state.viewCount;

/** Headers attached to every API request so server-side order/payment events join this session. */
export function analyticsHeaders() {
  if (disabled() || !state.started) return {};
  return { [VISITOR_HEADER]: state.visitorId, [SESSION_HEADER]: state.session?.id };
}

export { E as EVENTS };
