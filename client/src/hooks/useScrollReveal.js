import { useEffect, useRef } from 'react';

const TARGET = '[data-scroll-reveal]';
const ENTRANCES = new Set(['id-scroll-rise', 'id-scroll-fade', 'hp-line-flow']);

// One observer per mounted page. Pending elements stay visible: CSS only changes
// their appearance during an entrance, so motion is never required to read them.
export default function useScrollReveal() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.IntersectionObserver !== 'function'
      || typeof window.MutationObserver !== 'function' || !window.matchMedia) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 760px)');
    const records = new Map();
    const revealedKeys = new Set();
    let observer;
    let mutations;
    let disposed = false;
    let disabled = false;

    const finish = element => {
      const record = records.get(element);
      if (!record) return;
      window.clearTimeout(record.timer);
      observer?.unobserve(element);
      record.state = 'visible';
      record.pointerId = null;
      if (record.key) revealedKeys.add(record.key);
      element.dataset.revealState = 'visible';
      element.style.removeProperty('--scroll-delay');
      element.style.removeProperty('animation-play-state');
    };

    const showAll = () => records.forEach((_record, element) => finish(element));

    const start = (element, delay) => {
      const record = records.get(element);
      if (!record || record.state !== 'pending') return;
      observer.unobserve(element);
      if (disabled || reduced.matches || element.contains(document.activeElement)) {
        finish(element);
        return;
      }
      record.state = 'entering';
      // Remember the entrance immediately, including if CMS reordering remounts it.
      if (record.key) revealedKeys.add(record.key);
      element.style.setProperty('--scroll-delay', `${delay}ms`);
      element.dataset.revealState = 'entering';
      record.timer = window.setTimeout(() => finish(element),
        element.dataset.scrollReveal === 'connector' ? 4200 : 1200);
    };

    const syncTargets = () => {
      if (disposed) return;
      for (const [element, record] of records) {
        if (root.contains(element)) continue;
        observer.unobserve(element);
        window.clearTimeout(record.timer);
        element.removeAttribute('data-reveal-state');
        element.style.removeProperty('--scroll-delay');
        element.style.removeProperty('animation-play-state');
        records.delete(element);
      }
      try {
        root.querySelectorAll(TARGET).forEach(element => {
          if (records.has(element)) return;
          const key = element.dataset.revealKey;
          const bounds = element.getBoundingClientRect();
          records.set(element, { key, state: 'pending', timer: null });
          const alreadyInView = bounds.top < window.innerHeight + 24;
          const connector = element.dataset.scrollReveal === 'connector';
          if (disabled || reduced.matches || revealedKeys.has(key) || !bounds.height
            || element.contains(document.activeElement)
            || (alreadyInView && (!connector || bounds.bottom <= 0))) {
            finish(element);
            return;
          }
          observer.observe(element);
          element.dataset.revealState = 'pending';
        });
      } catch {
        // If observer setup fails partway through, restore every registered target.
        disabled = true;
        observer.disconnect();
        showAll();
      }
    };

    try {
      observer = new IntersectionObserver(entries => {
        if (disposed) return;
        const rows = new Map();
        entries.filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top
            || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach(entry => {
            const element = entry.target;
            if (records.get(element)?.state !== 'pending') return;
            const siblings = rows.get(element.parentElement) || [];
            let row = siblings.find(item => Math.abs(item.top - entry.boundingClientRect.top) < 4);
            if (!row) {
              row = { top: entry.boundingClientRect.top, count: 0 };
              siblings.push(row);
              rows.set(element.parentElement, siblings);
            }
            start(element, mobile.matches ? 0 : Math.min(row.count++ * 60, 180));
          });
      }, { threshold: 0, rootMargin: '0px 0px 24px 0px' });
      mutations = new MutationObserver(syncTargets);
      mutations.observe(root, { childList: true, subtree: true });
    } catch {
      observer?.disconnect();
      mutations?.disconnect();
      return;
    }

    const onFocus = event => {
      records.forEach((record, element) => {
        if (record.pointerId == null && element.contains(event.target)) finish(element);
      });
    };
    // Keep a pressed link at its current position until its click has bubbled.
    // Keyboard focus still reveals immediately; pointer focus must not move the
    // target between pointerdown and pointerup and accidentally cancel a click.
    const onPointerDown = event => {
      records.forEach((record, element) => {
        if (!element.contains(event.target)) return;
        if (record.state === 'pending') finish(element);
        else if (record.state === 'entering') {
          window.clearTimeout(record.timer);
          record.pointerId = event.pointerId;
          element.style.animationPlayState = 'paused';
        }
      });
    };
    const onPointerUp = event => {
      records.forEach((record, element) => {
        if (record.pointerId === event.pointerId) {
          // A drag/release outside the link may not produce a click.
          record.timer = window.setTimeout(() => finish(element), 200);
        }
      });
    };
    const releasePresses = () => records.forEach((record, element) => {
      if (record.pointerId != null) finish(element);
    });
    const onAnimationEnd = event => {
      if (ENTRANCES.has(event.animationName)) finish(event.target);
    };
    const onMotionChange = () => { if (reduced.matches) showAll(); };
    root.addEventListener('focusin', onFocus);
    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('animationend', onAnimationEnd);
    root.addEventListener('animationcancel', onAnimationEnd);
    window.addEventListener('beforeprint', showAll);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', releasePresses);
    window.addEventListener('click', releasePresses);
    window.addEventListener('blur', releasePresses);
    if (reduced.addEventListener) reduced.addEventListener('change', onMotionChange);
    else reduced.addListener(onMotionChange);
    syncTargets();

    return () => {
      disposed = true;
      observer.disconnect();
      mutations.disconnect();
      root.removeEventListener('focusin', onFocus);
      root.removeEventListener('pointerdown', onPointerDown, true);
      root.removeEventListener('animationend', onAnimationEnd);
      root.removeEventListener('animationcancel', onAnimationEnd);
      window.removeEventListener('beforeprint', showAll);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', releasePresses);
      window.removeEventListener('click', releasePresses);
      window.removeEventListener('blur', releasePresses);
      if (reduced.removeEventListener) reduced.removeEventListener('change', onMotionChange);
      else reduced.removeListener(onMotionChange);
      records.forEach((record, element) => {
        window.clearTimeout(record.timer);
        element.removeAttribute('data-reveal-state');
        element.style.removeProperty('--scroll-delay');
        element.style.removeProperty('animation-play-state');
      });
    };
  }, []);

  return rootRef;
}
