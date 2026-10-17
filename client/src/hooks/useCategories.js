import { useCallback } from 'react';
import { adminService, catalogService } from '../services/api';
import useApiResource from './useApiResource';

export default function useCategories(admin = false) {
  const load = useCallback(async signal => {
    const response = await (admin ? adminService : catalogService).getCategories({ signal });
    if (!response.success || !Array.isArray(response.data)) throw new Error('Categories could not be loaded.');
    return response.data;
  }, [admin]);
  const resource = useApiResource(load, admin ? undefined : 'categories');
  return { ...resource, categories: resource.data || [] };
}
