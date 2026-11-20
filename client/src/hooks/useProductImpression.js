import React, { useEffect, useRef } from 'react';
import { track, EVENTS, currentViewId } from '../services/analytics';

const VISIBLE_RATIO = 0.6;
const DWELL_MS = 1000;
const seen = new Set();

/**
 * Returns a ref for a product card. Records one `product_view` per product per screen view
 * once the card has been at least 60% visible for a full second.
 */
export default function useProductImpression(garment, list) {
  const ref = useRef(null);
  const id = garment?._id;

  useEffect(() => {
    const element = ref.current;
    if (!element || !id || typeof IntersectionObserver === 'undefined') return;
    let timer = null;
    const observer = new IntersectionObserver(([entry]) => {
      const key = `${currentViewId()}|${list}|${id}`;
      if (seen.has(key)) return;
      if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
        timer ??= window.setTimeout(() => {
          timer = null;
          if (seen.has(key)) return;
          seen.add(key);
          track(EVENTS.PRODUCT_VIEW, {
            productId: String(id),
            productName: garment.isCustom ? 'Custom item' : String(garment.name || '').slice(0, 80),
            category: String(garment.category || '').slice(0, 60),
            list,
          });
        }, DWELL_MS);
      } else if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    }, { threshold: [0, VISIBLE_RATIO, 1] });
    observer.observe(element);
    return () => { observer.disconnect(); if (timer) window.clearTimeout(timer); };
  }, [id, list]);

  return ref;
}

/** An <article> that records a product impression; for product cards rendered inside a list. */
export function ImpressionArticle({ garment, list, ...props }) {
  const ref = useProductImpression(garment, list);
  return React.createElement('article', { ref, ...props });
}
