/* Sandwich test, scene 3 — the new-14 stack (GSAP 3.13 + Locomotive 5/Lenis).
   - coin: 120 alpha-WebP frames on the fixed canvas, one scrubbed timeline
     (frames 0→119 over 0→150vh; scale 1→.6 by 100vh, →.5 by 150vh), then
     frozen face-on at the centre for the rest of the page;
   - titles: SplitText words in masks (lib/split.js), `.is-inview` from
     Locomotive's observer drives the CSS reveal-words contract;
   - story: the paragraph parts around the coin — lib/flow-around.js wraps it
     once and, every scroll frame, slides each line's two halves apart just
     enough to clear the coin silhouette (coin-shape.json, traced from frame
     119); no re-wrapping, nothing to animate — the motion is the scroll.
   ?cdn=1 → frames from jsDelivr instead of ./frames/ (the CDN check). */
import { gsap, ScrollTrigger, reduced } from '../lib/gsap.js';
import { initScroll, onScroll } from '../lib/scroll.js';
import { initSplit } from '../lib/split.js';
import { createFlow } from '../lib/flow-around.js';

const N = 120;
const LOCAL = 'frames/';
const CDN = 'https://cdn.jsdelivr.net/gh/roninsegun/new-15@main/test-sandwich/frames/';
const useCdn = new URLSearchParams(location.search).get('cdn') === '1';
const BASE = useCdn ? CDN : LOCAL;

/* ── choreography constants (fractions of the viewport height) ── */
const TURN_END = 1.5;     // frames 0→119 finish here
const SCALE_MID = 0.6;    // at 1vh
const SCALE_END = 0.5;    // at 1.5vh, then frozen

const canvas = document.getElementById('coin');
const ctx = canvas.getContext('2d');
const progress = document.getElementById('progress');
const frames = new Array(N);
let loaded = 0;
let current = -1;

const pad = (i) => String(i).padStart(3, '0');

/* ── frames ── */
function drawFrame(i) {
  if (i === current) return;
  const img = frames[i];
  if (!img || !img.complete || !img.naturalWidth) return; /* not in yet — keep the last frame */
  current = i;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function sizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const box = canvas.clientWidth;
  canvas.width = Math.round(box * dpr);
  canvas.height = Math.round(box * dpr);
  current = -1;
  drawFrame(targetFrame());
}

function load(i) {
  const img = new Image();
  if (useCdn) img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.onload = img.onerror = () => {
    loaded += 1;
    progress.textContent = `${loaded} / ${N}`;
    if (loaded === N) progress.classList.add('done');
    if (i === targetFrame()) { current = -1; drawFrame(i); }
  };
  img.src = `${BASE}${pad(i)}.webp`;
  frames[i] = img;
}
for (let i = 0; i < N; i += 1) load(i);

/* ── scroll + coin timeline ── */
const state = { frame: 0 };
const targetFrame = () => Math.round(state.frame);

initScroll();
initSplit();
/* Locomotive only classes [data-scroll] elements on its first scroll event;
   the screen-1 title is in view before any scroll, so mark it ourselves —
   two frames after fonts.ready, i.e. after lib/split.js has split it, so the
   words transition instead of appearing already settled. */
document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.7 && r.bottom > 0) el.classList.add('is-inview');
  });
})));

if (reduced) {
  state.frame = 0;
  gsap.set(canvas, { scale: SCALE_END });
} else {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { start: 0, end: () => innerHeight * TURN_END, scrub: true, invalidateOnRefresh: true },
    onUpdate: () => drawFrame(targetFrame()),
  });
  /* fromTo everywhere: with invalidateOnRefresh a plain .to() would re-read
     its start value from wherever the scroll happens to be at refresh time */
  tl.fromTo(state, { frame: 0 }, { frame: N - 1, duration: TURN_END }, 0)
    .fromTo(canvas, { scale: 1 }, { scale: SCALE_MID, duration: 1 }, 0)
    .fromTo(canvas, { scale: SCALE_MID }, { scale: SCALE_END, duration: TURN_END - 1, immediateRender: false }, 1);
}

/* ── the story flows around the coin (lib/flow-around.js) ── */
const text = document.querySelector('[data-story-text]');
let flow = null;

function updateFlow() {
  if (!flow) return;
  const box = text.getBoundingClientRect();
  const coin = canvas.getBoundingClientRect();          /* visual box, transform included */
  const size = coin.width;
  const cx = coin.left + coin.width / 2 - box.left;     /* coin centre in the paragraph's coords */
  const cy = coin.top + coin.height / 2 - box.top;
  const near = cy > -size && cy < box.height + size;
  flow.update(cx, cy, near ? size : 0);
}

fetch('coin-shape.json').then((r) => r.json()).then(async (shape) => {
  await document.fonts.ready;
  const gap = parseFloat(getComputedStyle(text).fontSize) * 0.4;   /* the .4em breathing room of the reference */
  flow = createFlow({ el: text, points: shape.points, centre: shape.centre, margin: gap });
  flow.measure();
  updateFlow();
  ScrollTrigger.refresh();
});

onScroll(updateFlow);
addEventListener('resize', () => {
  if (flow) flow.measure();
  ScrollTrigger.refresh();
  sizeCanvas();              /* after the refresh, so the canvas is redrawn with the settled frame */
  updateFlow();
});
sizeCanvas();

/* dev handle */
window.__test = {
  frames, state, updateFlow, get flow() { return flow; },
  get loaded() { return loaded; },
  get current() { return current; },
  get scale() { return gsap.getProperty(canvas, 'scale'); },
  base: BASE,
};
