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
  useEffect(() => {
    setResource({ identity, ...emptyOrderFeed() });
    if (!identity) return;
    const current = startOrderFeed({ load: orderService.getMyOrders, onChange: state => setResource({ identity, ...state }) });
    feed.current = current;
    return () => { current.stop(); feed.current = null; };
  }, [identity]);
  const refresh = useCallback(() => feed.current?.refresh(), []);
  const state = identity && resource.identity === identity ? resource : emptyOrderFeed();
  const value = { ...state, refresh, enabled: Boolean(identity), loading: Boolean(identity && !state.lastUpdated && !state.error) };
  return <CustomerOrdersContext.Provider value={value}>{children}</CustomerOrdersContext.Provider>;
}

export function useCustomerOrders() {
  const context = useContext(CustomerOrdersContext);
  if (!context) throw new Error('CustomerOrdersProvider is required.');
  return context;
}
