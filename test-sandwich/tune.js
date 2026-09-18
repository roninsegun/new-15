/* ?tune=1 — the hero tuner (Dmitriy: "штатный конфигуратор"). lil-gui
   (vendor/, three.js's stock dev panel) over the CSS tokens of style.css:
   every slider writes one custom property on <html>, so what the panel shows
   is exactly what the token default would render — fixing a setting means
   copying its number into :root. Temperature / tint are the one thing the
   CSS filter functions cannot do, so they run through an SVG feColorMatrix
   that exists only while tuning (html.is-tuning); once chosen they get baked
   into the WebPs with the same gains (tools/hero-layers.py). The session
   persists in localStorage; "copy" puts a flat JSON on the clipboard and in
   the console. Loaded only by main.js on ?tune=1 — nothing here ships. */
const STORE = 'obol-tune';
const NS = 'http://www.w3.org/2000/svg';

/* temperature / tint → per-channel gains (sRGB). One formula, mirrored in the bake:
   t, u in −1…1 · R·(1+.15t) · B·(1−.15t) · G·(1−.15u)  (u > 0 = magenta, < 0 = green, as in Lightroom) */
export const gains = (temp, tint) => {
  const t = temp / 100; const u = tint / 100;
  return { r: 1 + 0.15 * t, g: 1 - 0.15 * u, b: 1 - 0.15 * t };
};

export async function initTune() {
  const { default: GUI } = await import('../vendor/lil-gui.esm.min.js');
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const num = (name) => parseFloat(css.getPropertyValue(name));
  const toHex = (rgb) => `#${rgb.split(/\s+/).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`;
  const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

  /* the defaults are the tokens themselves — reset() lands on today's look */
  const p = {
    sat: num('--hero-sat'), temp: 0, tint: 0, bright: num('--hero-bri'), contrast: num('--hero-con'),
    backBright: num('--hero-back-bri'), fadeA: num('--hero-fade-a'), fadeB: num('--hero-fade-b'),
    color: toHex(css.getPropertyValue('--glow-rgb').trim()), alpha: num('--glow-a'), size: num('--glow-k'), core: num('--glow-core'),
  };

  /* the temperature matrix: an SVG filter the planes' img reference via url(#hero-grade) */
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  const filter = document.createElementNS(NS, 'filter');
  filter.setAttribute('id', 'hero-grade');
  filter.setAttribute('color-interpolation-filters', 'sRGB');   /* plain gains on sRGB values — what the bake reproduces */
  const matrix = document.createElementNS(NS, 'feColorMatrix');
  matrix.setAttribute('type', 'matrix');
  filter.append(matrix); svg.append(filter); document.body.append(svg);

  const set = (name, v) => root.style.setProperty(name, String(v));
  const apply = () => {
    set('--hero-sat', p.sat); set('--hero-bri', p.bright); set('--hero-con', p.contrast);
    set('--hero-back-bri', p.backBright); set('--hero-fade-a', `${p.fadeA}%`); set('--hero-fade-b', `${p.fadeB}%`);
    set('--glow-rgb', toRgb(p.color)); set('--glow-a', p.alpha); set('--glow-k', p.size); set('--glow-core', `${p.core}%`);
    const { r, g, b } = gains(p.temp, p.tint);
    matrix.setAttribute('values', `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`);
    root.classList.toggle('is-tuning', p.temp !== 0 || p.tint !== 0);   /* the url() filter only when it does something */
  };

  /* what Dmitriy sends back — flat, in the token order */
  const snapshot = () => ({
    planes: { saturation: p.sat, temperature: p.temp, tint: p.tint, brightness: p.bright, contrast: p.contrast },
    back: { brightness: p.backBright, fadeStart: p.fadeA, fadeFull: p.fadeB },
    glow: { color: p.color, alpha: p.alpha, size: p.size, core: p.core },
  });

  const gui = new GUI({ title: 'obol · hero tune', width: 260 });
  gui.domElement.setAttribute('data-lenis-prevent', '');   /* the wheel over the panel turns sliders, not the page */
  const planes = gui.addFolder('planes');
  planes.add(p, 'sat', 0, 2, 0.01).name('saturation');
  planes.add(p, 'temp', -100, 100, 1).name('temperature');
  planes.add(p, 'tint', -100, 100, 1).name('tint');
  planes.add(p, 'bright', 0, 2, 0.01).name('brightness');
  planes.add(p, 'contrast', 0, 2, 0.01).name('contrast');
  const back = gui.addFolder('back');
  back.add(p, 'backBright', 0, 2, 0.01).name('brightness');
  back.add(p, 'fadeA', 0, 100, 1).name('fade start %');
  back.add(p, 'fadeB', 0, 100, 1).name('fade full %');
  const glow = gui.addFolder('glow');
  glow.addColor(p, 'color').name('colour');
  glow.add(p, 'alpha', 0, 1, 0.01).name('alpha');
  glow.add(p, 'size', 1, 3, 0.01).name('size × coin');
  glow.add(p, 'core', 0, 100, 1).name('core %');
  gui.add({
    copy: () => {
      const json = JSON.stringify(snapshot(), null, 2);
      console.log(json);
      navigator.clipboard?.writeText(json).catch(() => {});
    },
  }, 'copy').name('copy settings');
  gui.add({ reset: () => gui.reset() }, 'reset').name('reset to defaults');

  gui.onChange(() => { apply(); try { localStorage.setItem(STORE, JSON.stringify(gui.save())); } catch { /* private mode */ } });
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) gui.load(JSON.parse(saved));   /* setValue → onChange → apply */
  } catch { /* stale or unreadable: start from the tokens */ }
  apply();
  gui.snapshot = snapshot;
  return gui;
}
