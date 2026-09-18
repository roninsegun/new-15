/* Sandwich test, scene 3 — the new-14 stack (GSAP 3.13 + Locomotive 5/Lenis).
   - coin: 120 alpha-WebP frames on the fixed canvas, one scrubbed timeline
     (frames 0→119 over 0→150vh; scale 1→.6 by 100vh, →.5 by 150vh), then
     frozen face-on at the centre for the rest of the page; every frame is
     graded to the painting's copper on the canvas;
   - hero painting: four fixed planes around the coin ride the same scrub over
     0→100vh — the scene lets go of the coin (docs/concept.md storyboard): the
     shore figures leave faster than the scroll, the boat recedes and
     dissolves, the far bank drifts and goes black, the glow goes with it;
   - titles: SplitText words in masks (lib/split.js), `.is-inview` from
     Locomotive's observer drives the CSS reveal-words contract;
   - story: the paragraph parts around the coin — lib/flow-around.js wraps it
     once and, every scroll frame, slides each line's two halves apart just
     enough to clear the coin silhouette (coin-shape.json, traced from frame
     119); no re-wrapping, nothing to animate — the motion is the scroll.
   ?cdn=1 → frames from jsDelivr instead of ./frames/ (the CDN check). */
import { gsap, ScrollTrigger, reduced } from '../lib/gsap.js';
import { initScroll, onScroll, getScroll } from '../lib/scroll.js';
import { initSplit } from '../lib/split.js';
import { createFlow } from '../lib/flow-around.js';
import { initImageLoad } from '../lib/reveal.js';

const N = 120;
const LOCAL = 'frames/';
const CDN = 'https://cdn.jsdelivr.net/gh/roninsegun/new-15@main/test-sandwich/frames/';
const useCdn = new URLSearchParams(location.search).get('cdn') === '1';
const BASE = useCdn ? CDN : LOCAL;

/* ── choreography constants (fractions of the viewport height) ── */
const TURN_END = 1.5;     // frames 0→119 finish here
const SCALE_MID = 0.6;    // at 1vh
const SCALE_END = 0.5;    // at 1.5vh, then frozen
const TINT = null;        // copper grade multiplied over every frame: '#ff9c55' (the painting's copper lifted ×1.15) — off, Dmitriy: "как печенька"
const BACK_OPACITY = 0.7; // the far bank at rest — it recedes (Dmitriy tried .1: too little)

const canvas = document.getElementById('coin');
const ctx = canvas.getContext('2d');
const progress = document.getElementById('progress');
const glow = document.getElementById('glow');
const [back, mid, frontL, frontR] = ['back', 'mid', 'front-l', 'front-r'].map((n) => document.querySelector(`.plane--${n}`));
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
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  if (!TINT) return;
  /* copper grade, clipped to the coin: multiply the tint over the frame (the
     rect covers the transparent area too), then keep only the frame's alpha */
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = TINT;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
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
const targetFrame = () => Math.round(state.frame) % N;   /* the chapters walk keeps adding turns */
const vh = (k) => () => innerHeight * k;   /* function values: re-read on every ScrollTrigger refresh */

/* reduced motion: no parallax — strip the speed attributes BEFORE Locomotive
   reads them at init */
if (reduced) document.querySelectorAll('[data-scroll-speed]').forEach((el) => el.removeAttribute('data-scroll-speed'));
initScroll();
initSplit();
initImageLoad();
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

gsap.set(back, { opacity: BACK_OPACITY });
if (reduced) {
  state.frame = 0;
  gsap.set([canvas, glow], { scale: SCALE_END });
  /* no motion: the painting simply fades out over the first half screen */
  const st = () => ({ start: 0, end: () => innerHeight * 0.5, scrub: true, invalidateOnRefresh: true });
  gsap.fromTo([mid, frontL, frontR, glow], { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: st() });
  gsap.fromTo(back, { opacity: BACK_OPACITY }, { opacity: 0, ease: 'none', scrollTrigger: st() });
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
    .fromTo(canvas, { scale: SCALE_MID }, { scale: SCALE_END, duration: TURN_END - 1, immediateRender: false }, 1)
    /* the painting, 0→1vh — rates are fractions of the scroll distance:
       front planes leave at 1× sideways + 1× down (1.4× along the diagonal),
       the boat recedes at .3× and shrinks, the far bank drifts at .1×;
       mid + back dissolve over .5→.9, the glow over .6→1 */
    .fromTo(back, { y: 0 }, { y: vh(-0.1), duration: 1 }, 0)
    .fromTo(back, { opacity: BACK_OPACITY }, { opacity: 0, duration: 0.4, immediateRender: false }, 0.5)
    .fromTo(mid, { y: 0, scale: 1 }, { y: vh(-0.3), scale: 0.94, duration: 1 }, 0)
    .fromTo(mid, { opacity: 1 }, { opacity: 0, duration: 0.4, immediateRender: false }, 0.5)
    .fromTo(frontL, { x: 0, y: 0 }, { x: vh(-1), y: vh(1), duration: 1 }, 0)
    .fromTo(frontR, { x: 0, y: 0 }, { x: vh(1), y: vh(1), duration: 1 }, 0)
    .fromTo(glow, { scale: 1 }, { scale: SCALE_MID, duration: 1 }, 0)
    .fromTo(glow, { opacity: 1 }, { opacity: 0, duration: 0.4, immediateRender: false }, 0.6);
}

/* ── mosaic 2.0 + the homage ──
   Coin: two fromTo triggers walk it to each arch's inner edge with one full
   turn per move, then a third brings it to centre as the homage spacer
   arrives — where the fresco panel (z 6) covers it. Words: each block's
   poster word, once revealed, scrubs down in scale and docks beside its text
   column. Homage: one master scrub over the spacer — the panel rises
   full-screen, shrinks into a frame (the giant word surfacing behind it),
   the arms part beyond the frame, the ground fades and splits in two, and
   the coin is left face-on over the word with the corner captions in. */
const CH_SCALE = 0.46;
const plates = gsap.utils.toArray('[data-plate]');
const homage = document.querySelector('[data-homage]');
if (!reduced && plates.length) {
  const plateX = (el) => () => {
    if (innerWidth < 768) return 0;
    const r = el.getBoundingClientRect();
    return (r.left + r.right) / 2 - innerWidth / 2;   /* the ARCH CENTRE (Dmitriy: по центру арки) */
  };
  const FACE = N - 1;                       /* frame 119: face-on, where the hero left it */
  const move = (st, vars, frames) => gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { scrub: true, invalidateOnRefresh: true, ...st },
    onUpdate: () => drawFrame(targetFrame()),
  })
    .fromTo(state, { frame: frames[0] }, { frame: frames[1], immediateRender: false }, 0)
    .fromTo(canvas, vars.from, { ...vars.to, immediateRender: false }, 0);
  plates.forEach((plate, i) => {
    move(
      { trigger: plate.closest('.chapter__archwrap'), start: 'top 92%', end: 'top 45%' },
      {
        from: { x: i === 0 ? 0 : plateX(plates[i - 1]), scale: i === 0 ? SCALE_END : CH_SCALE },
        to: { x: plateX(plate), scale: CH_SCALE },
      },
      [FACE + i * N, FACE + (i + 1) * N],   /* one full turn per move; % N in targetFrame */
    );
  });
  /* re-centre BEFORE the fresco rises (the homage master starts at 'top 80%') */
  move(
    { trigger: homage, start: 'top 98%', end: 'top 80%' },
    { from: { x: plateX(plates[plates.length - 1]), scale: CH_SCALE }, to: { x: 0, scale: SCALE_END } },
    [FACE + plates.length * N, FACE + (plates.length + 1) * N],
  );

  /* the SECOND poster word docks beside its text (the first stays centred —
     Dmitriy). Alignment is measured on the GLYPHS (first/last char masks),
     not the full-width centred H3 box, with the word's transform backed out. */
  const DOCK = 0.24;
  document.querySelectorAll('[data-block].chapter--flip').forEach((block) => {
    const word = block.querySelector('[data-word]');
    const target = block.querySelector('[data-dock-target]');
    gsap.set(word, { transformOrigin: 'left top' });
    const rects = () => {
      const t = word.style.transform;
      word.style.transform = 'none';
      const masks = word.querySelectorAll('.char-mask');
      const g0 = (masks[0] || word).getBoundingClientRect();
      const w = word.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      word.style.transform = t;
      return { w, tr, gLeft: g0.left, gTop: g0.top, gH: g0.height };
    };
    gsap.fromTo(word, { x: 0, y: 0, scale: 1 }, {
      scale: DOCK,
      /* glyph left lands ON the text's left edge; glyph top sits 20px above it */
      x: () => { const r = rects(); return r.tr.left - (r.w.left + (r.gLeft - r.w.left) * DOCK); },
      y: () => { const r = rects(); return (r.tr.top - r.gH * DOCK - 20) - (r.w.top + (r.gTop - r.w.top) * DOCK); },
      ease: 'none',
      scrollTrigger: { trigger: block.querySelector('.chapter__grid'), start: 'top 60%', end: 'top 8%', scrub: true, invalidateOnRefresh: true },
    });
  });

  /* ── the homage master scrub (units of 10 over the 380vh spacer) ──
     rise full-screen (the arms ride along) → hold → the ground shrinks into
     the frame while the arms HOLD their big scale and slowly lead away from
     the coin → the halves split and die (blur) → the coin keeps turning
     through it → the word plays its char reveal (class toggle, free of the
     scrub) → the two bottom captions. */
  const box = document.querySelector('.homage-panel__box');
  const halves = gsap.utils.toArray('.homage-panel__half');
  const arms = document.querySelector('.homage-arms');
  const wordH = document.querySelector('[data-hword]');
  const caps = document.querySelector('.homage-caps');
  const cover = () => 1.04 * Math.max(innerWidth / box.offsetWidth, innerHeight / box.offsetHeight);
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: homage, start: 'top 80%', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
      onUpdate: (self) => {
        drawFrame(targetFrame());
        wordH.classList.toggle('is-active', self.progress > 0.66);   /* plays its own 1.6s reveal, replays backwards */
      },
    },
  })
    .fromTo(['.homage-panel', '.homage-arms'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0)
    .fromTo(box, { y: vh(1), scale: cover }, { y: 0, duration: 1.8 }, 0)         /* TRUE full-screen: y 0 at cover scale */
    .fromTo(arms, { y: vh(1) }, { y: 0, duration: 1.8 }, 0)                      /* the arms arrive with the painting */
    .to({}, { duration: 0.8 }, 1.8)                                              /* full-screen hold */
    .to(box, { scale: 1, y: vh(0.07), duration: 1.8 }, 2.6)                      /* the ground pulls back into the frame */
    .to('.homage-arms__l', { x: () => -innerWidth * 0.58, duration: 3.4 }, 3)    /* the arms stay BIG and slowly lead away */
    .to('.homage-arms__r', { x: () => innerWidth * 0.58, duration: 3.4 }, 3)
    .fromTo(state, { frame: FACE + 3 * N }, { frame: FACE + 4 * N, duration: 3.6, immediateRender: false }, 3)   /* the coin turns through the reveal */
    .to(halves[0], { xPercent: -30, autoAlpha: 0, filter: 'blur(2px)', duration: 1.6 }, 4.6)
    .to(halves[1], { xPercent: 30, autoAlpha: 0, filter: 'blur(2px)', duration: 1.6 }, 4.6)
    .to(arms, { autoAlpha: 0, duration: 0.8 }, 5.9)                              /* руки исчезли */
    .set('.homage-panel', { autoAlpha: 0 }, 6.4)
    .fromTo(caps, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 7.2)
    .fromTo('.homage-caps__c', { y: 14, opacity: 0 }, { y: 0, opacity: 0.6, duration: 1, stagger: 0.2 }, 7.2)
    .to({}, { duration: 1 }, 9);                                                 /* end-state hold */
} else if (reduced) {
  /* the end-state poster, no phases */
  document.querySelector('[data-hword]').classList.add('is-active');
  gsap.set('.homage-caps', { autoAlpha: 1 });
  gsap.set('.homage-caps__c', { opacity: 0.6 });
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
  planes: { back, mid, frontL, frontR }, glow,
  get scroll() { return getScroll(); },   /* Lenis owns the scroll: drive it through here, not window.scrollTo */
  base: BASE,
};
