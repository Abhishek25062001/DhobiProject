import { useCallback, useRef } from 'react';
import useApiResource from './useApiResource';
import { serviceAreaService } from '../services/api';
const validPincode = value => /^[1-9]\d{5}$/.test(value);
const available = (result, pincode) => validPincode(pincode) && result?.serviceable === true && result.area?.isActive === true && result.area.pincodes?.includes(pincode);

export default function usePincodeCoverage(value) {
  const pincode = String(value || '').trim();
  const latest = useRef(pincode); latest.current = pincode;
  const load = useCallback(async signal => validPincode(pincode) ? serviceAreaService.check(pincode, { signal }) : { serviceable: false }, [pincode]);
  const resource = useApiResource(load);
  const supported = !resource.error && !resource.loading && available(resource.data, pincode);
  const verify = async () => {
    const result = await resource.retry();
    return latest.current === pincode && available(result, pincode);
  };
  return { ...resource, supported, area: supported ? resource.data.area : null, verify };
}
