/* Sandwich test: N alpha-WebP frames of the coin drawn on the fixed canvas,
   frame index = document scroll progress. No libraries.
   ?cdn=1 → frames come from jsDelivr instead of ./frames/ (the CDN check). */
const N = 120;
const LOCAL = 'frames/';
const CDN = 'https://cdn.jsdelivr.net/gh/roninsegun/new-15@main/test-sandwich/frames/';
const useCdn = new URLSearchParams(location.search).get('cdn') === '1';
const BASE = useCdn ? CDN : LOCAL;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('coin');
const ctx = canvas.getContext('2d');
const progress = document.getElementById('progress');
const frames = new Array(N);
let loaded = 0;
let current = -1;
let raf = 0;

const pad = (i) => String(i).padStart(3, '0');

function frameIndex() {
  if (reduced) return 0;
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  return Math.round(p * (N - 1));
}

function draw() {
  raf = 0;
  const i = frameIndex();
  if (i === current) return;
  const img = frames[i];
  if (!img || !img.complete || !img.naturalWidth) return; /* not in yet — keep the last frame */
  current = i;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  current = -1;
  schedule();
}

function load(i) {
  const img = new Image();
  if (useCdn) img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.onload = img.onerror = () => {
    loaded += 1;
    progress.textContent = `${loaded} / ${N}`;
    if (loaded === N) progress.classList.add('done');
    if (i === frameIndex()) { current = -1; schedule(); }
  };
  img.src = `${BASE}${pad(i)}.webp`;
  frames[i] = img;
}

for (let i = 0; i < N; i += 1) load(i);

addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', resize);
resize();

/* dev handle */
window.__test = { frames, get loaded() { return loaded; }, get current() { return current; }, frameIndex, base: BASE };
