/* Smooth scroll + the class contract.
   Locomotive Scroll 5 (bundled, Lenis 1.3.17 inside) owns the scroll:
   - Lenis with a heavier glide than its defaults: lerp .07 (≈ .55s to 90% of the
     way instead of .4s) and a wheel step 15% shorter — the page slides rather
     than jumps (Dmitriy, stage 7: "резковато"); touch keeps native inertia;
   - the ticker is gsap's, so Lenis, ScrollTrigger and every tween step in
     one frame; ScrollTrigger.update rides the lenis scroll event;
   - [data-scroll] elements get `.is-inview` from Locomotive's IntersectionObserver
     (rootMargin -1px) honouring data-scroll-offset / -repeat / -speed / -css-progress.
   Exactly the reference's <Scroll /> component. */
import { gsap, ScrollTrigger } from './gsap.js';

let instance = null;
const listeners = new Set();

export function initScroll() {
  if (instance) return instance;
  instance = new window.LocomotiveScroll({
    lenisOptions: { lerp: 0.07, wheelMultiplier: 0.85, touchMultiplier: 1.3, syncTouch: false },
    initCustomTicker: (render) => gsap.ticker.add(render),
    destroyCustomTicker: (render) => gsap.ticker.remove(render),
    scrollCallback: (e) => listeners.forEach((fn) => fn(e)),
  });
  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }
  instance.lenisInstance?.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);
  bindAnchors();
  return instance;
}

export const getScroll = () => instance;
export const onScroll = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/* in-page anchors glide for 2s through Lenis instead of jumping */
function bindAnchors() {
  const isSamePage = (href) => {
    if (href.startsWith('#')) return true;
    const u = new URL(href, location.origin);
    return u.pathname === location.pathname && u.hash.length > 0;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !href.includes('#')) return;
    const hash = href.slice(href.indexOf('#'));
    if (hash && hash !== '#' && isSamePage(href) && document.querySelector(hash)) {
      e.preventDefault();
      instance?.scrollTo(hash, { duration: 2 });
    }
  });
  if (location.hash) {
    const hash = location.hash;
    requestAnimationFrame(() => instance?.scrollTo(hash, { duration: 2 }));
  }
}
