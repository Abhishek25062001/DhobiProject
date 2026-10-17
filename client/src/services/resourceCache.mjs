export const REFRESH_INTERVAL_MS = 30000;
const initial = () => ({ data: null, loading: true, refreshing: false, error: null, fetchedAt: 0 });

export function createResourceCache({ now = Date.now } = {}) {
  const records = new Map();
  const get = key => {
    if (!records.has(key)) records.set(key, { state: initial(), listeners: new Set(), generation: 0, pending: null, stale: true });
    return records.get(key);
  };
  const publish = (record, patch) => { record.state = { ...record.state, ...patch }; record.listeners.forEach(listener => listener()); };
  async function refresh(key, force = false) {
    const record = get(key);
    if (!record.load) return record.state.data;
    if (record.pending && !force) return record.pending;
    if (force) record.controller?.abort();
    const generation = ++record.generation;
    const controller = new AbortController(); record.controller = controller;
    publish(record, { loading: record.state.data === null, refreshing: true });
    record.pending = Promise.resolve().then(() => record.load(controller.signal)).then(data => {
      if (record.generation !== generation) return record.state.data;
      const unchanged = record.state.data?.revision && data?.revision === record.state.data.revision;
      record.stale = false;
      publish(record, { data: unchanged ? record.state.data : data, loading: false, refreshing: false, error: null, fetchedAt: now() });
      return record.state.data;
    }).catch(error => {
      if (record.generation === generation && !controller.signal.aborted) publish(record, { loading: false, refreshing: false, error });
      return null;
    }).finally(() => { if (record.generation === generation) record.pending = null; });
    return record.pending;
  }
  return {
    snapshot: key => get(key).state,
    subscribe(key, load, listener) {
      const record = get(key); record.load = load; record.listeners.add(listener);
      if (record.stale || now() - record.state.fetchedAt >= REFRESH_INTERVAL_MS) refresh(key);
      return () => {
        record.listeners.delete(listener);
        if (typeof key !== 'string' && !record.listeners.size) { record.controller?.abort(); record.generation++; records.delete(key); }
      };
    },
    refresh,
    invalidate({ fetch = true } = {}) {
      for (const [key, record] of records) { record.stale = true; if (fetch && record.listeners.size) refresh(key, true); }
    },
    refreshActive() { for (const [key, record] of records) if (record.listeners.size) refresh(key); },
  };
}

export const resourceCache = createResourceCache();
export function installRefreshEvents(cache, { target, document, interval = setInterval, clear = clearInterval, channel = null }) {
  const visible = () => document.visibilityState !== 'hidden';
  const refresh = () => { if (visible()) cache.invalidate(); };
  const incoming = () => cache.invalidate({ fetch: visible() });
  const storage = event => { if (event.key === 'indodhobi:content-revision') incoming(); };
  target.addEventListener('focus', refresh);
  target.addEventListener('online', refresh);
  target.addEventListener('indodhobi:data-changed', incoming);
  target.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', refresh);
  channel?.addEventListener('message', incoming);
  const timer = interval(() => { if (visible()) cache.refreshActive(); }, REFRESH_INTERVAL_MS);
  return () => {
    clear(timer); target.removeEventListener('focus', refresh); target.removeEventListener('online', refresh);
    target.removeEventListener('indodhobi:data-changed', incoming); target.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', refresh); channel?.removeEventListener('message', incoming);
  };
}
let channel;
let installed = false;
export function ensureRefreshEvents() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('indodhobi:content');
  installRefreshEvents(resourceCache, { target: window, document, channel });
}
export function notifyContentChanged() {
  ensureRefreshEvents();
  resourceCache.invalidate();
  channel?.postMessage({ type: 'content-changed' });
  if (!channel) try { window.localStorage.setItem('indodhobi:content-revision', `${Date.now()}-${Math.random()}`); } catch { /* Focus and periodic refresh remain available. */ }
}
