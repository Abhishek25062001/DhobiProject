// Master geometry for the logo, loader, and exported brand assets.
export const BRAND_COLOR = '#5030ef';
export const BRAND_REVISION = 'hanger-1';
export const HANGER_PATH = 'M25 16C25 6.7 39 6.7 39 16C39 22 32 22 32 28L9.5 43.5C4.3 47.1 7 53.6 13 52.3L22 50.3M32 28L54.5 43.5C59.7 47.1 57 53.6 51 52.3L42 50.3';
export const DEFAULT_LOGO = '/images/laundry/brand-mark.svg';
export const DEFAULT_FAVICON = '/images/laundry/brand-favicon.svg';

export function brandAssetUrl(asset, fallback) {
  const url = asset?.url || fallback;
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  const revision = [DEFAULT_LOGO, DEFAULT_FAVICON].includes(url) ? `&brand=${BRAND_REVISION}` : '';
  return `${url}${separator}v=${encodeURIComponent(asset?.version || 1)}${revision}`;
}
