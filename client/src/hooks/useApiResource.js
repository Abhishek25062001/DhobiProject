import { useCallback, useEffect, useState } from 'react';

export default function useApiResource(load) {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const retry = useCallback(() => setRequest(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error });
    });
    return () => controller.abort();
  }, [load, request]);

  useEffect(() => {
    if (!state.error) return;
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
    };
  }, [state.error, retry]);

  return { ...state, retry };
}
