import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';
import { emptyOrderFeed, startActiveOrderFeed } from '../services/activeOrderFeed.mjs';

export default function useActiveOrders() {
  const { user, token, isAuthenticated } = useAuth();
  const identity = isAuthenticated && user?.role === 'customer' ? `${user._id}:${token}` : null;
  const [resource, setResource] = useState({ identity: null, ...emptyOrderFeed() });
  const feed = useRef(null);
  useEffect(() => {
    setResource({ identity, ...emptyOrderFeed() });
    if (!identity) return;
    const current = startActiveOrderFeed({
      load: orderService.getMyActiveOrders,
      onChange: state => setResource({ identity, ...state }),
    });
    feed.current = current;
    return () => { current.stop(); feed.current = null; };
  }, [identity]);
  const refresh = useCallback(() => feed.current?.refresh(), []);
  return { ...(identity && resource.identity === identity ? resource : emptyOrderFeed()), refresh, enabled: Boolean(identity) };
}
