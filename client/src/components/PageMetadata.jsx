import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import usePageCopy from '../hooks/usePageCopy';
import { useGlobalContent } from '../context/SiteContentContext';
import { CONTENT_PAGE_PATHS } from '../utils/contentPages';

export default function PageMetadata() {
  const { pathname } = useLocation();
  const { global } = useGlobalContent();
  const content = usePageCopy(CONTENT_PAGE_PATHS[pathname.replace(/\/$/, '') || '/'] || 'global');
  useEffect(() => {
    const seo = content.page?.seo || global.page?.seo;
    document.title = content.text(seo?.title);
    function meta(name, value, property = false) {
      const attr = property ? 'property' : 'name';
      let element = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!value) { element?.remove(); return; }
      if (!element) { element = document.createElement('meta'); element.setAttribute(attr, name); document.head.appendChild(element); }
      element.content = value;
    }
    meta('description', content.text(seo?.description));
    meta('og:title', content.text(seo?.title), true);
    meta('og:description', content.text(seo?.description), true);
    meta('og:image', seo?.image?.asset?.url || '', true);
    const favicon = global.section('branding')?.favicon?.asset;
    let icon = document.head.querySelector('link[rel="icon"]');
    if (!favicon?.url) icon?.remove();
    else {
      if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
      icon.removeAttribute('type');
      icon.href = `${favicon.url}${favicon.url.includes('?') ? '&' : '?'}v=${favicon.version}`;
    }
  }, [content.page, global.page, pathname, content.text]);
  return null;
}
