import { useCallback } from 'react';
import useApiResource from './useApiResource';
import { serviceAreaService } from '../services/api';

export default function useServiceAreas() {
  const load = useCallback(signal => serviceAreaService.list({ signal }), []);
  const resource = useApiResource(load, 'service-areas');
  return { ...resource, areas: resource.data?.areas || [] };
}
