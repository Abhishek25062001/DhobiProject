import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { orderService } from '../services/api';
import { emptyOrderFeed, startOrderFeed } from '../services/activeOrderFeed.mjs';

const CustomerOrdersContext = createContext(null);

// One account-scoped snapshot and one polling loop for Home, details and history.
// Completed/cancelled orders remain here; only the Home selection filters them out.
export function CustomerOrdersProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const identity = isAuthenticated && user?.role === 'customer' ? `${user._id}:${token}` : null;
  const [resource, setResource] = useState({ identity: null, ...emptyOrderFeed() });
  const feed = useRef(null);
  const cursors = useRef([null]);
  const nextCursor = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setResource({ identity, ...emptyOrderFeed() });
    cursors.current = [null]; nextCursor.current = null;
    if (!identity) return;
    const current = startOrderFeed({ load: async options => {
      const pages = await Promise.all(cursors.current.map(cursor => orderService.getMyOrders({ ...options, params: cursor ? { cursor } : {} })));
      // Keep active bookings visible even when they predate the first history page.
      const active = await orderService.getMyActiveOrders(options);
      nextCursor.current = pages.at(-1).nextCursor;
      return { success: true, orders: [...new Map([...active.activeOrders, ...pages.flatMap(page => page.orders)].map(order => [order._id, order])).values()].sort((a, b) => b._id.localeCompare(a._id)) };
    }, onChange: state => setResource({ identity, ...state }) });
    feed.current = current;
    return () => { current.stop(); feed.current = null; };
  }, [identity]);
  const refresh = useCallback(() => feed.current?.refresh(), []);
  const state = identity && resource.identity === identity ? resource : emptyOrderFeed();
  const loadMore = async () => {
    if (!nextCursor.current || loadingMore) return;
    cursors.current.push(nextCursor.current); setLoadingMore(true);
    try { await refresh(); } finally { setLoadingMore(false); }
  };
  const value = { ...state, refresh, loadMore, hasMore: Boolean(nextCursor.current), loadingMore, enabled: Boolean(identity), loading: Boolean(identity && !state.lastUpdated && !state.error) };
  return <CustomerOrdersContext.Provider value={value}>{children}</CustomerOrdersContext.Provider>;
}

export function useCustomerOrders() {
  const context = useContext(CustomerOrdersContext);
  if (!context) throw new Error('CustomerOrdersProvider is required.');
  return context;
}
