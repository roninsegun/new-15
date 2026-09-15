/* Text that flows around a hole in the middle of its lines.
   CSS cannot do this: a line box is one contiguous run, and shape-outside on a
   float only shortens it from the float's side — two centred half-shapes just
   leave an empty band. So the paragraph is laid out here: every word is an
   absolutely positioned span; the words flow greedily line by line, and a
   line whose band meets the hole (a polygon in the paragraph's coordinates,
   dilated by `margin`) is split into the segments left/right of it, words
   centred inside each segment. The flow is CONTINUOUS — one reading stream
   through all segments, exactly like typographic wrap around an object.
   Re-run `update()` with the hole's new position on every scroll frame.

   Motion (the liquid part). Positions are scroll-linked, so the base
   transform is always written exactly and never eased. Any horizontal
   change stays instant — it is the continuous part of the wrap. Only a
   LINE change is an event, animated additively on top of the exact base:
     - block shift — the line count changed and a run of words all moved by
                     the same delta: an additive translate glides from the
                     old spot (vertical, never crosses the hole);
     - re-wrap hop — a word landed on another line: it materialises in its
                     new place (opacity + blur + a small rise), no travel,
                     so nothing ever flies across the hole.
   Hysteresis: a word keeps its segment until it overflows by `hyst`, so a
   boundary word does not flicker across a 1px scroll.
   Buried alternatives (do not resurrect): a transition on every word made
   words trail the object and overlap; a "local zone" re-flow that froze a
   baseline wrap and re-flowed only the hole's lines dumped leftover words
   in clumps under the object and killed the continuous-wrap look.

   createFlow({ el, points, centre, margin, animate, ease })
     el      — the <p>; its text (and inline .script spans) becomes the words
     points  — [[x, y] …] silhouette in fractions of the object's box, in order
     centre  — [x, y] silhouette centre in the same fractions
     margin  — gap between text and silhouette, px
     animate — false → positions only (prefers-reduced-motion)
   → { measure(), update(cx, cy, size), height, last, words }
     update(cx, cy, size): hole centre in the paragraph's coordinates and the
     object's box size in px; pass size 0 (or cy far away) for no hole. */

const GLIDE_MS = 320;
const MATERIALIZE_MS = 240;
const EASE_OUT_STRONG = 'cubic-bezier(.23, 1, .32, 1)';   /* Emil's strong ease-out */

export function createFlow({ el, points, centre, margin = 16, animate = true, ease = EASE_OUT_STRONG }) {
  /* 1. tokenise: keep the .script runs, split on whitespace */
  const words = [];
  el.normalize();
  const walk = (node, script) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent;
      /* a run that starts without whitespace glues to the previous word — "…ferryman</span>, paid" */
      const glue = words.length > 0 && !/^\s/.test(raw);
      raw.split(/\s+/).filter(Boolean).forEach((t, k) => words.push({ text: t, script, glue: glue && k === 0 }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const glue = words.length > 0 && node.previousSibling && node.previousSibling.nodeType === Node.TEXT_NODE && !/\s$/.test(node.previousSibling.textContent);
      const before = words.length;
      node.childNodes.forEach((c) => walk(c, script || node.classList.contains('script')));
      if (glue && words[before]) words[before].glue = true;
    }
  };
  [...el.childNodes].forEach((n) => walk(n, false));
  el.textContent = '';
  el.classList.add('flow');
  words.forEach((w) => {
    const s = document.createElement('span');
    s.className = w.script ? 'flow__w script' : 'flow__w';
    s.textContent = w.text;
    el.appendChild(s);
    w.el = s;
    w.x = 0; w.y = 0; w.line = -1; w.seg = -1;
    w.nx = 0; w.ny = 0; w.nline = -1; w.nseg = -1;
    w.move = null; w.fade = null;
  });

  const state = { W: 0, L: 0, space: 0, height: 0, key: '', laid: false, last: { set: 0, glide: 0, materialize: 0 } };
  const hyst = margin * 0.35;

  function measure() {
    const cs = getComputedStyle(el);
    state.W = el.clientWidth;
    state.L = parseFloat(cs.lineHeight);
    const probe = document.createElement('span');
    probe.className = 'flow__w';
    probe.textContent = ' ';
    el.appendChild(probe);
    state.space = probe.getBoundingClientRect().width;
    probe.remove();
    words.forEach((w) => { w.width = w.el.getBoundingClientRect().width; });
    state.key = '';
  }

  /* horizontal extent of the hole over the band [ya, yb] — vertices inside the
     band plus edge crossings of its two rails; null when the band misses it */
  function holeAt(ya, yb, cx, cy, size) {
    let lo = Infinity;
    let hi = -Infinity;
    const n = points.length;
    for (let i = 0; i < n; i += 1) {
      const [px0, py0] = points[i];
      const [px1, py1] = points[(i + 1) % n];
      const x0 = cx + (px0 - centre[0]) * size;
      const y0 = cy + (py0 - centre[1]) * size;
      const x1 = cx + (px1 - centre[0]) * size;
      const y1 = cy + (py1 - centre[1]) * size;
      if (y0 >= ya && y0 <= yb) { lo = Math.min(lo, x0); hi = Math.max(hi, x0); }
      for (const rail of [ya, yb]) {
        if ((y0 - rail) * (y1 - rail) < 0) {
          const x = x0 + (x1 - x0) * (rail - y0) / (y1 - y0);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
    }
    return lo === Infinity ? null : [lo - margin, hi + margin];
  }

  function place(w, x, y, line, seg) { w.nx = x; w.ny = y; w.nline = line; w.nseg = seg; }

  /* greedy fill of words[i..) into [sx, ex] at line y; returns the next word index */
  function fill(i, sx, ex, line, seg, y) {
    const { W, space } = state;
    const N = words.length;
    const avail = ex - sx;
    const start = i;
    let used = 0;
    while (i < N) {
      const w = words[i];
      const gap = used === 0 ? 0 : (w.glue ? 0 : space);
      const next = used + gap + w.width;
      const slack = w.line === line && w.seg === seg ? hyst : 0;    /* hysteresis: stay put until it really overflows */
      if (next > avail + slack && used > 0) break;
      if (next > avail + slack && used === 0 && avail < W) break;   /* narrow segment: skip it */
      used = next;
      i += 1;
    }
    if (i === start) return i;
    let x = sx + (avail - used) / 2;                                /* centred inside the segment */
    for (let k = start; k < i; k += 1) {
      const w = words[k];
      if (k > start) x += w.glue ? 0 : space;
      place(w, x, y, line, seg);
      x += w.width;
    }
    return i;
  }

  /* 2. layout → w.nx / w.ny / w.nline / w.nseg; returns the line count.
     One continuous stream: every line takes the next words, split around the
     hole where the hole is. A band the hole covers completely just advances. */
  function layout(cx, cy, size) {
    const { W, L } = state;
    let line = 0;
    let i = 0;
    const N = words.length;
    while (i < N) {
      const y = line * L;
      const hole = size > 0 ? holeAt(y - margin * 0.5, y + L + margin * 0.5, cx, cy, size) : null;
      if (!hole || hole[1] <= 0 || hole[0] >= W) {
        i = fill(i, 0, W, line, 0, y);
      } else {
        if (hole[0] > 0) i = fill(i, 0, hole[0], line, 0, y);
        if (hole[1] < W) i = fill(i, hole[1], W, line, 1, y);
      }
      line += 1;   /* full-width lines always place at least one word, so this terminates */
    }
    return line;
  }

  /* 3. apply: classify every move against the previous frame, write the exact
     base transform, then start the additive animation the event deserves */
  const visualOffset = (w) => {
    /* where the word is drawn right now (running animations included) minus its new base */
    const m = new DOMMatrixReadOnly(getComputedStyle(w.el).transform);
    return [m.m41 - w.nx, m.m42 - w.ny];
  };
  const glide = (w, ox, oy) => {
    if (w.move) w.move.cancel();
    w.move = w.el.animate(
      [{ transform: `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)` }, { transform: 'translate(0px, 0px)' }],
      { duration: GLIDE_MS, easing: ease, composite: 'add' },
    );
    w.move.onfinish = () => { w.move = null; };
  };
  const materialize = (w) => {
    if (w.move) { w.move.cancel(); w.move = null; }
    if (w.fade) w.fade.cancel();
    const rise = state.L * 0.25;
    w.move = w.el.animate(
      [{ transform: `translate(0px, ${rise.toFixed(1)}px)` }, { transform: 'translate(0px, 0px)' }],
      { duration: MATERIALIZE_MS, easing: ease, composite: 'add' },
    );
    w.move.onfinish = () => { w.move = null; };
    w.fade = w.el.animate(
      [{ opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)' }],
      { duration: MATERIALIZE_MS, easing: ease },
    );
    w.fade.onfinish = () => { w.fade = null; };
  };

  function apply() {
    const { L } = state;
    const N = words.length;
    const first = !state.laid;
    const plan = new Array(N);
    let pdx = 0;
    let pdy = 0;
    /* read phase — decide, and read visual offsets before any base changes.
       Horizontal-only changes are ALWAYS instant: they are the continuous
       part of the wrap (x-glides were the mush — buried, do not resurrect). */
    for (let i = 0; i < N; i += 1) {
      const w = words[i];
      const dx = w.nx - w.x;
      const dy = w.ny - w.y;
      let kind = 'set';
      if (!first && animate && Math.abs(dy) >= L * 0.5) {
        kind = (i > 0 && Math.abs(dy - pdy) < 0.5 && Math.abs(dx - pdx) < 0.5) ? 'glide' : 'materialize';
      }
      let off = null;
      if (kind === 'glide') off = w.move ? visualOffset(w) : [-dx, -dy];
      plan[i] = { kind, off };
      pdx = dx; pdy = dy;
    }
    /* write phase */
    const last = { set: 0, glide: 0, materialize: 0 };
    for (let i = 0; i < N; i += 1) {
      const w = words[i];
      const p = plan[i];
      w.el.style.transform = `translate(${w.nx.toFixed(1)}px, ${w.ny.toFixed(1)}px)`;
      if (p.kind === 'glide') glide(w, p.off[0], p.off[1]);
      else if (p.kind === 'materialize') materialize(w);
      w.x = w.nx; w.y = w.ny; w.line = w.nline; w.seg = w.nseg;
      last[p.kind] += 1;
    }
    state.last = last;
    state.laid = true;
  }

  function update(cx, cy, size) {
    if (!state.W) measure();
    const key = `${state.W}|${size > 0 ? `${cx.toFixed(1)},${cy.toFixed(1)},${size.toFixed(1)}` : 'none'}`;
    if (key === state.key) return;
    state.key = key;
    const lines = layout(cx, cy, size);
    apply();
    const h = lines * state.L;
    if (h !== state.height) { state.height = h; el.style.height = `${h}px`; }
  }

  return { measure, update, get height() { return state.height; }, get last() { return state.last; }, words };
}
