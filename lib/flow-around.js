/* Text that flows around a hole in the middle of its lines.
   CSS cannot do this: a line box is one contiguous run, and shape-outside on a
   float only shortens it from the float's side — two centred half-shapes just
   leave an empty band. So the paragraph is laid out here: every word is an
   inline-block span, positioned with transform; each line is split into the
   segments left/right of the hole (a polygon in the paragraph's coordinates,
   dilated by `margin`), words are placed greedily into the segments and
   centred inside each one. Re-run `update()` with the hole's new position on
   every scroll frame — 150 words re-place in well under a millisecond. No
   transition on the words: positions are scroll-linked, and easing them
   makes words trail the object and overlap (tried, reverted).

   createFlow({ el, points, centre, margin })
     el      — the <p>; its text (and inline .script spans) becomes the words
     points  — [[x, y] …] silhouette in fractions of the object's box, in order
     centre  — [x, y] silhouette centre in the same fractions
     margin  — gap between text and silhouette, px
   → { measure(), update(cx, cy, size), height }
     update(cx, cy, size): hole centre in the paragraph's coordinates and the
     object's box size in px; pass size 0 (or cy far away) for no hole. */

export function createFlow({ el, points, centre, margin = 16 }) {
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
  });

  const state = { W: 0, L: 0, space: 0, height: 0, key: '' };

  function measure() {
    const cs = getComputedStyle(el);
    state.W = el.clientWidth;
    state.L = parseFloat(cs.lineHeight);
    /* width of one space in the paragraph face */
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

  function update(cx, cy, size) {
    if (!state.W) measure();
    const { W, L, space } = state;
    const key = `${W}|${size > 0 ? `${cx.toFixed(1)},${cy.toFixed(1)},${size.toFixed(1)}` : 'none'}`;
    if (key === state.key) return;
    state.key = key;

    let line = 0;
    let i = 0;
    const N = words.length;
    while (i < N) {
      const ya = line * L;
      const yb = ya + L;
      const hole = size > 0 ? holeAt(ya - margin * 0.5, yb + margin * 0.5, cx, cy, size) : null;
      const segments = [];
      if (!hole || hole[1] <= 0 || hole[0] >= W) segments.push([0, W]);
      else {
        if (hole[0] > 0) segments.push([0, hole[0]]);
        if (hole[1] < W) segments.push([hole[1], W]);
      }
      for (const [sx, ex] of segments) {
        const avail = ex - sx;
        const start = i;
        let used = 0;
        while (i < N) {
          const w = words[i].width;
          const gap = used === 0 ? 0 : (words[i].glue ? 0 : space);
          const next = used + gap + w;
          if (next > avail && used > 0) break;
          if (next > avail && used === 0 && avail < W) break;   /* narrow segment: skip it */
          used = next;
          i += 1;
        }
        if (i === start) continue;
        let x = sx + (avail - used) / 2;                       /* centred inside the segment */
        for (let k = start; k < i; k += 1) {
          const w = words[k];
          if (k > start) x += w.glue ? 0 : space;
          w.el.style.transform = `translate(${x.toFixed(1)}px, ${ya.toFixed(1)}px)`;
          x += w.width;
        }
      }
      line += 1;   /* a band where nothing fits (hole across the whole width) just advances */
    }
    const h = line * L;
    if (h !== state.height) { state.height = h; el.style.height = `${h}px`; }
  }

  return { measure, update, get height() { return state.height; }, words };
}
