/* Text that parts around an object passing through it.
   The paragraph is wrapped ONCE (greedy, full width, centred lines) and the
   words never change lines. Every line has a fixed split — the word gap
   nearest the column centre, which is where the fixed object sits — and on
   every scroll frame the words left of the split move left, the words right
   of it move right, by exactly what it takes to clear the object's
   silhouette (a polygon in the paragraph's coordinates, dilated by
   `margin`) on that line. No hole → no shift. Everything is a continuous
   function of the object's position: lines open as it arrives and close as
   it leaves, nothing ever jumps, so nothing is animated — the motion is the
   scroll itself.
   Buried alternatives (do not resurrect): re-wrapping words between lines
   around the hole — every hop cascades through the paragraph below, and no
   amount of easing (transitions, zone re-flow, additive glides) hides it.

   createFlow({ el, points, centre, margin })
     el      — the <p>; its text (and inline .script spans) becomes the words
     points  — [[x, y] …] silhouette in fractions of the object's box, in order
     centre  — [x, y] silhouette centre in the same fractions
     margin  — gap between text and silhouette, px
   → { measure(), update(cx, cy, size), height, words, lines }
     update(cx, cy, size): object centre in the paragraph's coordinates and
     the object's box size in px; size 0 (or cy far away) → lines at rest. */

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
    w.x = 0; w.y = 0; w.shift = null;
  });

  const state = { W: 0, L: 0, space: 0, height: 0 };
  let lines = [];   /* [{ y, words, split, leftEnd, rightStart }] */

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
    wrap();
  }

  /* 2. the one and only wrap: greedy full-width lines, centred; each line gets
     its split (the gap nearest the column centre) and the rest edges of the
     two groups it makes */
  function wrap() {
    const { W, L, space } = state;
    lines = [];
    let i = 0;
    while (i < words.length) {
      const start = i;
      let used = 0;
      while (i < words.length) {
        const w = words[i];
        const next = used + (used === 0 ? 0 : (w.glue ? 0 : space)) + w.width;
        if (next > W && used > 0) break;
        used = next;
        i += 1;
      }
      const y = lines.length * L;
      let x = (W - used) / 2;
      const lineWords = words.slice(start, i);
      lineWords.forEach((w, k) => {
        if (k > 0) x += w.glue ? 0 : space;
        w.x = x; w.y = y; w.shift = null;
        w.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        x += w.width;
      });
      /* split: the gap whose middle is nearest the column centre (0 = all right, n = all left) */
      const mid = W / 2;
      let split = 0;
      let best = Infinity;
      for (let k = 0; k <= lineWords.length; k += 1) {
        const gx = k === 0 ? lineWords[0].x : k === lineWords.length ? lineWords[k - 1].x + lineWords[k - 1].width
          : (lineWords[k - 1].x + lineWords[k - 1].width + lineWords[k].x) / 2;
        const d = Math.abs(gx - mid);
        if (d < best) { best = d; split = k; }
      }
      const leftEnd = split > 0 ? lineWords[split - 1].x + lineWords[split - 1].width : -Infinity;
      const rightStart = split < lineWords.length ? lineWords[split].x : Infinity;
      const gap = split === 0 ? rightStart : split === lineWords.length ? leftEnd : (leftEnd + rightStart) / 2;
      lines.push({ y, words: lineWords, split, leftEnd, rightStart, gap });
    }
    state.height = lines.length * L;
    el.style.height = `${state.height}px`;
  }

  /* horizontal extent of the hole over a line's band [ya, yb]. Vertices count
     with a weight that ramps from 0 at `ramp` px outside the band to 1 at the
     band edge, pulling their x towards `anchor` (the line's split gap) while
     they are still entering — otherwise the coin's flat bottom edge would land
     in a band all at once and the line would pop open in one frame, and a gap
     that sits a few px off the coin centre would snap open/shut by that
     offset. Inside the band the weight is 1, so the clearance is exact. */
  function holeAt(ya, yb, cx, cy, size, anchor) {
    const ramp = margin * 2;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [px, py] of points) {
      const x = cx + (px - centre[0]) * size;
      const y = cy + (py - centre[1]) * size;
      const depth = Math.min(y - (ya - ramp), (yb + ramp) - y);   /* how far inside the extended band */
      if (depth <= 0) continue;
      const wgt = Math.min(1, depth / ramp);
      const xe = anchor + (x - anchor) * wgt;   /* the hole opens out of the line's own gap, not the coin centre */
      lo = Math.min(lo, xe - margin * wgt);
      hi = Math.max(hi, xe + margin * wgt);
    }
    return lo === Infinity ? null : [lo, hi];
  }

  const setShift = (w, s) => {
    if (w.shift === s) return;
    w.shift = s;
    w.el.style.transform = `translate(${(w.x + s).toFixed(1)}px, ${w.y.toFixed(1)}px)`;
  };

  /* 3. every frame: part each line around the hole, or let it rest */
  function update(cx, cy, size) {
    if (!state.W) measure();
    const { L } = state;
    for (const ln of lines) {
      const hole = size > 0 ? holeAt(ln.y, ln.y + L, cx, cy, size, ln.gap) : null;
      let left = 0;
      let right = 0;
      if (hole) {
        left = Math.max(0, ln.leftEnd - hole[0]);
        right = Math.max(0, hole[1] - ln.rightStart);
      }
      ln.words.forEach((w, k) => setShift(w, k < ln.split ? -left : right));
    }
  }

  return { measure, update, get height() { return state.height; }, get lines() { return lines; }, words };
}
