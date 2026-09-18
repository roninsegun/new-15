# OBOL — the coin that came back

A scroll-storytelling prototype: one brass obol (120 alpha WebP frames on a fixed canvas, scrubbed by the
scroll) walks a black longread through a renaissance-fresco world — the hero throw, the story flowing around
it, two arch icons where it docks face-on, the "It came / back." homage.

- **Live page:** https://roninsegun.github.io/new-15/test-sandwich/
- **Source:** `test-sandwich/` (index.html, style.css, main.js) + `lib/` (GSAP / Locomotive glue, SplitText,
  flow-around, reveal) — any static server from the repo root, then `/test-sandwich/`. `?cdn=1` loads the
  frames from jsDelivr instead of `frames/`.
- **Hand-over copies** (built with `python3 tools/build-siblings.py`, flat, `index.html` at the root):
  `../new-15-offline` — zero network dependencies; `../new-15-cdn` — every media file from jsDelivr, pinned
  to one commit. Each has its own README.
- **Concept & storyboard:** `docs/concept.md`. Asset pipelines: `tools/` (hero planes, arch layers, coin
  frames), sources under `assets/src/` and `assets/video/` (not shipped).

Stack: GSAP 3.13 (ScrollTrigger, SplitText) + Locomotive Scroll 5 (Lenis inside), self-hosted in `vendor/`;
Inter Tight, Newsreader (variable, 200–800), Pinyon Script, self-hosted in `fonts/`. No build step.
