/* [data-split] → SplitText, after the font is in (a split measured against
   the fallback face re-flows). Every unit carries its index as a custom
   property (propIndex → --line / --word / --char, 1-based) — that index IS the
   stagger, computed in CSS (`transition-delay: calc(var(--word) * 75ms)`).
   `mask` wraps each unit in `.<unit>-mask`; style.css swaps its overflow:clip
   for a clip-path with vertical bleed.
   Attributes: data-split="lines|words|chars" (default lines),
               data-split-mask="lines|words|chars" (default lines). */
import { gsap, ScrollTrigger, SplitText } from './gsap.js';

let refreshQueued = false;
const queueRefresh = () => {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; ScrollTrigger.refresh(); });
};

export function initSplit(root = document) {
  const splits = [];
  let cancelled = false;
  document.fonts.ready.then(() => requestAnimationFrame(() => {
    if (cancelled) return;
    gsap.utils.toArray('[data-split]', root).forEach((el) => {
      const { split, splitMask } = el.dataset;
      splits.push(new SplitText(el, {
        tag: 'span',
        type: split?.toLowerCase() || 'lines',
        mask: splitMask?.toLowerCase() || 'lines',
        charsClass: 'char',
        wordsClass: 'word',
        linesClass: 'line',
        propIndex: true,
        autoSplit: true,
        onSplit: queueRefresh,
      }));
    });
  }));
  return () => { cancelled = true; splits.forEach((s) => s.revert()); };
}
