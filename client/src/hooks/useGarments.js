import { useCallback } from 'react';
import { catalogService } from '../services/api';
import useApiResource from './useApiResource';

export default function useGarments(category = '', search = '') {
  const load = useCallback(signal => catalogService.getGarments(category, search, false, { signal }), [category, search]);
  const resource = useApiResource(load);
  return { ...resource, garments: resource.data?.data || [] };
}
