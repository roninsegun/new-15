/* Sandwich test, scene 3 — the new-14 stack (GSAP 3.13 + Locomotive 5/Lenis).
   - coin: 120 alpha-WebP frames on the fixed canvas, one scrubbed timeline
     (frames 0→119 over 0→150vh; the THROW: scale .5 → 1 by 45vh → .5 by
     100vh — the ferryman tossed it, it comes at you and drops back to the
     size it keeps for the rest of the page, Dmitriy), then face-on at the
     centre until the chapters;
   - hero painting: three fixed planes around the coin ride the same scrub
     over 0→100vh — the scene lets go of the coin (docs/concept.md
     storyboard): the shore figures leave faster than the scroll, the boat
     casts off and dissolves; no far bank, no glow — the black of the page
     is the water (Dmitriy: dropped, "чтобы не грузило");
   - titles: SplitText words in masks (lib/split.js), `.is-inview` from
     Locomotive's observer drives the CSS reveal-words contract;
   - story: the paragraph parts around the coin — lib/flow-around.js wraps it
     once and, every scroll frame, slides each line's two halves apart just
     enough to clear the coin silhouette (coin-shape.json, traced from frame
     119); no re-wrapping, nothing to animate — the motion is the scroll.
   ?cdn=1 → frames from jsDelivr instead of ./frames/ (the CDN check);
   ?tune=1 → the hero tuner panel (tune.js) over the grade tokens. */
import { gsap, ScrollTrigger, reduced } from '../lib/gsap.js';
import { initScroll, onScroll, getScroll } from '../lib/scroll.js';
import { initSplit } from '../lib/split.js';
import { createFlow } from '../lib/flow-around.js';
import { initImageLoad } from '../lib/reveal.js';

const N = 120;
const q = new URLSearchParams(location.search);
const COIN = q.get('coin') === 'copper' ? 'frames-copper' : 'frames';   /* frames/ = the brass coin (default); ?coin=copper → the old copper one */
const LOCAL = `${COIN}/`;
const CDN = `https://cdn.jsdelivr.net/gh/roninsegun/new-15@main/test-sandwich/${COIN}/`;
const useCdn = q.get('cdn') === '1';
const BASE = useCdn ? CDN : LOCAL;
const SHAPE = COIN === 'frames-copper' ? 'coin-shape-copper.json' : 'coin-shape.json';
const FRAMES_V = '2';      /* bump when frames/ changes under the same names (cache-buster) */

/* ── choreography constants (fractions of the viewport height) ── */
const TURN_END = 1.5;     // frames 0→119 finish here
const THROW_PEAK = 0.45;  // the throw: scale SCALE_END → 1 by here …
const THROW_END = 1.0;    // … and back to SCALE_END by here (where it drops into the second title)
const SCALE_END = 0.5;    // the coin's size for the rest of the page (the hero starts at it too)
const TINT = null;        // copper grade multiplied over every frame: '#ff9c55' (the painting's copper lifted ×1.15) — off, Dmitriy: "как печенька"

const canvas = document.getElementById('coin');
const ctx = canvas.getContext('2d');
const progress = document.getElementById('progress');
const [mid, frontL, frontR] = ['mid', 'front-l', 'front-r'].map((n) => document.querySelector(`.plane--${n}`));
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
  img.src = `${BASE}${pad(i)}.webp?v=${FRAMES_V}`;
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

if (reduced) {
  state.frame = 0;
  gsap.set(canvas, { scale: SCALE_END });
  /* no motion: the painting simply fades out over the first half screen */
  gsap.fromTo([mid, frontL, frontR], { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { start: 0, end: () => innerHeight * 0.5, scrub: true, invalidateOnRefresh: true } });
} else {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { start: 0, end: () => innerHeight * TURN_END, scrub: true, invalidateOnRefresh: true },
    onUpdate: () => drawFrame(targetFrame()),
  });
  /* fromTo everywhere: with invalidateOnRefresh a plain .to() would re-read
     its start value from wherever the scroll happens to be at refresh time */
  tl.fromTo(state, { frame: 0 }, { frame: N - 1, duration: TURN_END }, 0)
    /* the throw: out at the viewer, slowing at the apex, then it drops back */
    .fromTo(canvas, { scale: SCALE_END }, { scale: 1, duration: THROW_PEAK, ease: 'sine.out' }, 0)
    .fromTo(canvas, { scale: 1 }, { scale: SCALE_END, duration: THROW_END - THROW_PEAK, ease: 'sine.inOut', immediateRender: false }, THROW_PEAK)
    /* the painting, 0→1vh — rates are fractions of the scroll distance:
       front planes leave at 1× sideways + 1× down (1.4× along the diagonal),
       the boat casts off to the RIGHT (.35×) and only a little up (.07×) while
       it shrinks — it sails, it does not float up (Dmitriy) — and dissolves
       over .5→.9 */
    .fromTo(mid, { x: 0, y: 0, scale: 1 }, { x: vh(0.35), y: vh(-0.07), scale: 0.94, duration: 1 }, 0)
    .fromTo(mid, { opacity: 1 }, { opacity: 0, duration: 0.4, immediateRender: false }, 0.5)
    .fromTo(frontL, { x: 0, y: 0 }, { x: vh(-1), y: vh(1), duration: 1 }, 0)
    .fromTo(frontR, { x: 0, y: 0 }, { x: vh(1), y: vh(1), duration: 1 }, 0);
}

/* ── mosaic 2.0 + the homage ──
   The coin, from the chapters on (Dmitriy): ONE master timeline `walk` over
   the whole range (chapters' arrival → end of the homage), 1 unit = 1px of
   scroll, rebuilt from fresh rects on every ScrollTrigger refresh. It is
   NOT scrubbed: the scroll only sets a target progress, and a critically
   damped spring on the ticker carries the timeline to it — the coin
   accelerates and brakes in a bell, so a wheel flick makes it glide, not
   leap (Emil: springs feel natural because they simulate physics; the
   default scrub catch-up is expo-out and starts with a jolt). Inside
   (Dmitriy): ONE full turn from the story's tail to the first arch, where
   the coin HOLDS face-on; one full turn to the second arch, held face-on
   again; after that it just keeps turning with the scroll to the end (whole
   turns, so it ends face-on). Every move to an arch centre rides
   power2.inOut with a slight lift, shrinking to half over the arch and back
   to full as the arch's bottom passes the coin; then to centre before the
   fresco rises. */
const ARCH_SCALE = SCALE_END * 0.5;       /* −50 % over an arch */
const TURN_VH = 1.5;                      /* the free run after the last arch: one full turn per 1.5 viewport heights */
const LIFT_VH = 0.04;                     /* the arc of a move: up 4vh at its middle */
const SPRING_PERIOD = 1.3;                /* s — the follower's natural period (ζ = 1, no overshoot) */
const MAX_VH_PER_S = 1.2;                 /* the follower never runs the choreography faster than this (a wheel flick → a stately glide) */
const plates = gsap.utils.toArray('[data-plate]');
const chapters = document.querySelector('[data-chapters]');
const homage = document.querySelector('[data-homage]');
let walk = null;
let devFollow = null; let devSpring = null;   /* dev handle: step the follower by hand */
if (!reduced && plates.length) {
  const FACE = N - 1;                       /* frame 119: face-on, where the hero left it */
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  const centreX = (el) => {
    if (innerWidth < 768) return 0;
    const r = el.getBoundingClientRect();
    return (r.left + r.right) / 2 - innerWidth / 2;   /* the ARCH CENTRE */
  };
  const range = { s0: 0, d: 1 };
  const spring = { cur: 0, vel: 0, target: 0 };
  const buildWalk = () => {
    if (walk) walk.kill();
    const vh = innerHeight;
    const S0 = docTop(chapters) - 0.5 * vh;   /* = the story's tail (50vh) has just left: the turn starts after the text, not over it */
    const S1 = docTop(homage) + homage.offsetHeight - vh;
    const D = S1 - S0;
    range.s0 = S0; range.d = D;
    const at = (docY, frac) => docY - frac * vh - S0;   /* timeline time of "docY at viewport fraction frac" */
    walk = gsap.timeline({ paused: true, defaults: { ease: 'none', immediateRender: false } });
    const move = (t0, t1, x0, x1) => {
      const d = t1 - t0;
      walk.fromTo(canvas, { x: x0 }, { x: x1, duration: d, ease: 'power2.inOut' }, t0)
        .fromTo(canvas, { y: 0 }, { y: -LIFT_VH * vh, duration: d / 2, ease: 'sine.out' }, t0)
        .fromTo(canvas, { y: -LIFT_VH * vh }, { y: 0, duration: d / 2, ease: 'sine.in' }, t0 + d / 2);
    };
    let x = 0;
    let prevLeaveEnd = -Infinity;
    const holds = [];   /* per arch: [docked, leaving] — the coin is face-on and still in between */
    plates.forEach((plate) => {
      const wrap = plate.closest('.chapter__archwrap');
      const wt = docTop(wrap);
      const wb = wt + wrap.offsetHeight;
      const cx = centreX(plate);
      /* approach: long and early, but never before the previous arch's leave has
         finished — and never before the walk itself starts (a negative position
         would make GSAP shift the whole timeline and misalign it with the scroll) */
      const a0 = Math.max(at(wt, 0.75), prevLeaveEnd + 0.02 * vh, 0); const a1 = at(wt, 0.08);
      move(a0, a1, x, cx);
      walk.fromTo(canvas, { scale: SCALE_END }, { scale: ARCH_SCALE, duration: a1 - a0, ease: 'power2.inOut' }, a0);
      /* leave: the arch's bottom passes the coin (viewport centre) — back to full */
      const l0 = at(wb, 0.72); const l1 = at(wb, 0.4);
      walk.fromTo(canvas, { scale: ARCH_SCALE }, { scale: SCALE_END, duration: l1 - l0, ease: 'power2.inOut' }, l0);
      holds.push([a1, l0]);
      prevLeaveEnd = l1;
      x = cx;
    });
    /* the turns: exactly one per leg (story → arch 1, arch 1 → arch 2), each
       landing face-on as the coin docks; nothing in between (the hold); then
       a free run to the end at TURN_VH, in whole turns */
    let t = 0;
    holds.forEach(([docked, leaving]) => {
      walk.fromTo(state, { frame: FACE }, { frame: FACE + N, duration: Math.max(1, docked - t) }, t);
      t = leaving;
    });
    const rest = Math.max(1, D - t);
    const turns = Math.max(1, Math.round(rest / (vh * TURN_VH)));
    walk.fromTo(state, { frame: FACE }, { frame: FACE + turns * N, duration: rest }, t);
    /* re-centre BEFORE the fresco rises (the homage master starts at 'top 80%') */
    const ht = docTop(homage);
    move(at(ht, 0.98), at(ht, 0.8), x, 0);
    /* land exactly where the scroll is — no glide on load / resize */
    spring.target = spring.cur = gsap.utils.clamp(0, 1, (scrollY - S0) / D);
    spring.vel = 0;
    walk.progress(spring.cur);
    drawFrame(targetFrame());
  };
  buildWalk();
  ScrollTrigger.addEventListener('refreshInit', buildWalk);
  /* a refresh re-renders the scrubbed hero timeline AFTER refreshInit built
     and rendered the walk — past its end it writes the canvas scale .5 and
     frame 119 (the walk's own start state), so a refresh mid-walk (a resize,
     the load event) would park the coin at the centre until the next scroll
     tick moved the spring. Re-render the walk once the refresh is done. */
  ScrollTrigger.addEventListener('refresh', () => {
    if (spring.cur <= 0) return;   /* still in the hero: its own scrub owns the canvas — a forced render at 0 would clobber it */
    walk.render(walk.totalTime(), true, true); drawFrame(targetFrame());
  });
  /* the follower: semi-implicit Euler on a critically damped spring */
  const omega = (2 * Math.PI) / SPRING_PERIOD;
  const follow = (time, deltaMs) => {
    spring.target = gsap.utils.clamp(0, 1, (scrollY - range.s0) / range.d);
    const gap = spring.target - spring.cur;
    if (Math.abs(gap) < 1e-6 && Math.abs(spring.vel) < 1e-6) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const acc = omega * omega * gap - 2 * omega * spring.vel;
    const vmax = (MAX_VH_PER_S * innerHeight) / range.d;   /* progress units per second */
    spring.vel = gsap.utils.clamp(-vmax, vmax, spring.vel + acc * dt);
    spring.cur += spring.vel * dt;
    if (Math.abs(spring.target - spring.cur) < 1e-6) { spring.cur = spring.target; spring.vel = 0; }
    walk.progress(spring.cur);
    drawFrame(targetFrame());
  };
  gsap.ticker.add(follow);
  devFollow = follow; devSpring = spring;

  /* (both poster words stay centred and static — the second one's shrink-and-
     dock scrub overlapped its text and is gone, Dmitriy) */

  /* ── the homage master scrub (units of 10 over the 380vh spacer) ──
     rise full-screen (the arms ride along) → hold → the ground shrinks into
     the frame while the arms part QUICKLY to a finger's breadth (Dmitriy's
     screenshot: the fingertips ~12vw apart), then only drift → the arms open
     further and, with the coin showing between the fingertips, the ground
     goes through a heavy blur, darkens and breaks in two — much later than
     before → the coin keeps turning through it → the word plays its char
     reveal (class toggle, free of the scrub) → the two bottom captions. */
  const box = document.querySelector('.homage-panel__box');
  const halves = gsap.utils.toArray('.homage-panel__half');
  const arms = document.querySelector('.homage-arms');
  const wordH = gsap.utils.toArray('[data-hword]');   /* the two twins (line 1 behind the coin, line 2 over it) */
  const caps = document.querySelector('.homage-caps');
  const cover = () => 1.04 * Math.max(innerWidth / box.offsetWidth, innerHeight / box.offsetHeight);
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: homage, start: 'top 80%', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
      onUpdate: (self) => {
        wordH.forEach((el) => el.classList.toggle('is-active', self.progress > 0.7));   /* plays its own 1.6s reveal, replays backwards */
      },
    },
  })
    .fromTo(['.homage-panel', '.homage-arms'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0)
    .fromTo(box, { y: vh(1), scale: cover }, { y: 0, duration: 1.8 }, 0)         /* TRUE full-screen: y 0 at cover scale */
    .fromTo(arms, { y: vh(1) }, { y: 0, duration: 1.8 }, 0)                      /* the arms arrive with the painting */
    .to({}, { duration: 0.8 }, 1.8)                                              /* full-screen hold */
    .to(box, { scale: 1, y: vh(0.07), duration: 1.8 }, 2.6)                      /* the ground pulls back into the frame */
    /* the arms stay BIG; three beats: A — quick, to a finger's breadth (±5vw
       → the fingertips ~12vw apart) · B — a slow drift while the ground
       settles into its frame · C — open wide, the coin (~15vw) showing between */
    .to('.homage-arms__l', { x: () => -innerWidth * 0.05, duration: 1, ease: 'power2.out' }, 3)
    .to('.homage-arms__r', { x: () => innerWidth * 0.05, duration: 1, ease: 'power2.out' }, 3)
    .to('.homage-arms__l', { x: () => -innerWidth * 0.10, duration: 2.4 }, 4)
    .to('.homage-arms__r', { x: () => innerWidth * 0.10, duration: 2.4 }, 4)
    .to('.homage-arms__l', { x: () => -innerWidth * 0.45, duration: 1.8, ease: 'power1.in' }, 6.4)
    .to('.homage-arms__r', { x: () => innerWidth * 0.45, duration: 1.8, ease: 'power1.in' }, 6.4)
    /* the ground goes only now — heavy blur, darkens, breaks in two (Dmitriy: much later, strong) */
    .to(halves[0], { xPercent: -20, autoAlpha: 0, filter: 'blur(20px)', duration: 1.4 }, 6.6)
    .to(halves[1], { xPercent: 20, autoAlpha: 0, filter: 'blur(20px)', duration: 1.4 }, 6.6)
    .to(arms, { autoAlpha: 0, duration: 0.8 }, 7.8)                              /* руки исчезли */
    .set('.homage-panel', { autoAlpha: 0 }, 8)
    .fromTo(caps, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 8.6)
    .fromTo('.homage-caps__c', { y: 14, opacity: 0 }, { y: 0, opacity: 0.6, duration: 1, stagger: 0.2 }, 8.6)
    .to({}, { duration: 0.4 }, 9.6);                                               /* end-state hold */
} else if (reduced) {
  /* the end-state poster, no phases */
  document.querySelectorAll('[data-hword]').forEach((el) => el.classList.add('is-active'));
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

fetch(`${SHAPE}?v=${FRAMES_V}`).then((r) => r.json()).then(async (shape) => {
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

/* ?tune=1 — the hero tuner (tune.js + vendor/lil-gui): the grade of the
   planes as live sliders over the CSS tokens. Nothing of it is fetched
   without the flag. */
let tune = null;
if (q.get('tune') === '1') import('./tune.js').then((m) => m.initTune()).then((gui) => { tune = gui; });

/* dev handle */
window.__test = {
  frames, state, updateFlow, get flow() { return flow; }, get tune() { return tune; },
  get loaded() { return loaded; },
  get current() { return current; },
  get scale() { return gsap.getProperty(canvas, 'scale'); },
  planes: { mid, frontL, frontR },
  get walk() { return walk; },
  follow: (dtMs) => devFollow && devFollow(0, dtMs), get spring() { return devSpring; },
  get scroll() { return getScroll(); },   /* Lenis owns the scroll: drive it through here, not window.scrollTo */
  base: BASE,
};
