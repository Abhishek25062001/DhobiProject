import ManagedImage from './ManagedImage';
import { BRAND_REVISION, DEFAULT_LOGO } from '../branding/identity.mjs';

// Keep uploaded logos editable while refreshing cached copies of the built-in mark.
export default function BrandLogo({ reference, ...props }) {
  const asset = reference?.asset;
  const image = asset?.url === DEFAULT_LOGO
    ? { ...reference, asset: { ...asset, url: `${DEFAULT_LOGO}?brand=${BRAND_REVISION}` } }
    : reference;
  return <ManagedImage optional reference={image} loading="eager" {...props} />;
}
