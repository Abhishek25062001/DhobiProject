import useSiteContent from './useSiteContent';
import { useGlobalContent } from '../context/SiteContentContext';

export default function usePageCopy(pageKey) {
  const { config, bindings } = useGlobalContent();
  const resource = useSiteContent(pageKey, config, bindings);
  return Object.assign(resource.t, resource);
}
