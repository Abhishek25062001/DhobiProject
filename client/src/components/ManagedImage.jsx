import React, { useState } from 'react';
import { Shirt } from 'lucide-react';

export default function ManagedImage({ reference, className = '', width = 100, height = 100, optional = false, ...imageProps }) {
  const asset = reference?.asset;
  const [failed, setFailed] = useState('');
  const src = asset?.url ? `${asset.url}${asset.url.includes('?') ? '&' : '?'}v=${asset.version || 1}` : '';
  const alt = reference?.decorative ? '' : reference?.alt ?? asset?.defaultAlt ?? '';
  if ((!src || src === failed) && optional) return null;
  if (!src || src === failed) return <span className={className} aria-hidden="true"><Shirt width="100%" height="100%" strokeWidth={1.3} /></span>;
  if (asset.crop?.position) return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined} className={`${className} hp-sprite hp-sprite-${asset.crop.kind || 'image'}`} style={{ backgroundImage: `url(${JSON.stringify(src)})`, backgroundPosition: asset.crop.position, backgroundSize: asset.crop.size || '300% 300%' }}><img src={src} alt="" className="hidden" onError={() => setFailed(src)} /></span>;
  return <img className={className} src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" onError={() => setFailed(src)} {...imageProps} />;
}
