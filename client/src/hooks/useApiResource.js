import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { resourceCache, ensureRefreshEvents } from '../services/resourceCache.mjs';

export default function useApiResource(load, cacheKey) {
  const key = useMemo(() => cacheKey || Symbol('private-resource'), [cacheKey, load]);
  const subscribe = useCallback(listener => resourceCache.subscribe(key, load, listener), [key, load]);
  const snapshot = useCallback(() => resourceCache.snapshot(key), [key]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const retry = useCallback(() => resourceCache.refresh(key, true), [key]);
  useEffect(ensureRefreshEvents, []);
  return { ...state, retry };
}
