import useApiResource from './useApiResource';
import { mediaService } from '../services/api';
const load = signal => mediaService.list(false, { signal });
export default function useMediaLibrary() {
  return useApiResource(load, 'media-library');
}
