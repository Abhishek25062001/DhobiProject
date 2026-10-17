import { useCallback } from 'react';
import useApiResource from './useApiResource';
import { contentService } from '../services/api';
import { bindContentText } from '../../../shared/contentSchema.mjs';

export default function useSiteContent(pageKey, config = null, bindings = {}) {
  const load = useCallback(signal => contentService.get(pageKey, { signal }), [pageKey]);
  const resource = useApiResource(load, `content:${pageKey}`);
  const page = resource.data?.page || null;
  const sections = page?.sections || [];
  const section = key => sections.find(item => item.key === key)?.content || null;
  const text = value => bindContentText(value, config, { ...bindings, ...(pageKey === 'home' ? { 'home.turnaroundHours': section('hero')?.turnaroundHours } : {}) });
  const copy = section('copy')?.entries || [];
  const t = key => text(copy.find(item => item.id === key)?.value);
  return { ...resource, page, sections, section, text, t };
}
