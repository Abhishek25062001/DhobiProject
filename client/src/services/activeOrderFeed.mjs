export const ORDER_POLL_INTERVAL_MS = 5000;
export const ORDER_CHANGED_EVENT = 'indodhobi:orders-changed';
const revisionKey = 'indodhobi:orders-revision';
export const emptyOrderFeed = () => ({ orders: [], refreshing: false, error: null, lastUpdated: null });

export function notifyOrdersChanged(target = window) {
  target.dispatchEvent(new Event(ORDER_CHANGED_EVENT));
  try { target.localStorage.setItem(revisionKey, `${Date.now()}-${Math.random()}`); } catch { /* Polling remains available when storage is disabled. */ }
}

// One request at a time, only while visible. A stopped feed can never publish
// a late response into another account's session.
export function startActiveOrderFeed({
  load, onChange, target = window, document = target.document,
  isOnline = () => target.navigator.onLine !== false,
  interval = setInterval, clear = clearInterval, now = Date.now,
}) {
  let state = emptyOrderFeed();
  let stopped = false;
  let pending = null;
  let controller;
  const publish = patch => {
    if (stopped) return;
    state = { ...state, ...patch }; onChange(state);
  };
  const visible = () => document.visibilityState !== 'hidden';
  function refresh() {
    if (stopped || !visible()) return Promise.resolve();
    if (!isOnline()) { publish({ error: 'offline' }); return Promise.resolve(); }
    if (pending) return pending;
    controller = new AbortController();
    const signal = controller.signal;
    publish({ refreshing: true });
    pending = Promise.resolve().then(() => load({ signal })).then(response => {
      if (stopped || signal.aborted) return;
      if (!response?.success || !Array.isArray(response.activeOrders) ||
        response.activeOrders.some(order => !order?._id || typeof order.orderStatus !== 'string')) {
        throw new Error('Invalid active order response');
      }
      publish({ orders: response.activeOrders, error: null, lastUpdated: now() });
    }).catch(error => {
      if (stopped || signal.aborted) return;
      const unauthorized = [401, 403].includes(error.response?.status);
      publish({ error: unauthorized ? 'auth' : 'unavailable', ...(unauthorized ? { orders: [], lastUpdated: null } : {}) });
    }).finally(() => {
      pending = null;
      publish({ refreshing: false });
    });
    return pending;
  }
  const offline = () => { controller?.abort(); publish({ error: 'offline', refreshing: false }); };
  const visibility = () => { if (visible()) refresh(); };
  const storage = event => { if (event.key === revisionKey) refresh(); };
  for (const event of ['focus', 'online', ORDER_CHANGED_EVENT]) target.addEventListener(event, refresh);
  target.addEventListener('offline', offline);
  target.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', visibility);
  const timer = interval(refresh, ORDER_POLL_INTERVAL_MS);
  refresh();
  return {
    refresh,
    stop() {
      stopped = true; controller?.abort(); clear(timer);
      for (const event of ['focus', 'online', ORDER_CHANGED_EVENT]) target.removeEventListener(event, refresh);
      target.removeEventListener('offline', offline);
      target.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
