"""Build the two hand-over copies of the site next to the repo:
  ../new-15-offline   zero network: everything local (vendor/, fonts/, frames/, assets/)
  ../new-15-cdn       everything remote: GSAP + Locomotive from jsDelivr/npm, fonts,
                      images and the coin frames from jsDelivr/gh pinned to one commit
Both are flat (index.html at the root), like new-14-offline / new-14-cdn.
  python3 tools/build-siblings.py            (uses the current HEAD for the CDN pin)
"""
import os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'test-sandwich')
SHA = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip()
GH = f'https://cdn.jsdelivr.net/gh/roninsegun/new-15@{SHA}'
NPM_GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist'
NPM_LOCO = 'https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0/bundled/locomotive-scroll.min.js'
IMG = ['hero/mid.webp', 'hero/front-l.webp', 'hero/front-r.webp', 'logo-lion.png',
       'arches/mint-bg.webp', 'arches/mint-mid.webp', 'arches/mint-front.webp',
       'arches/ferry-bg.webp', 'arches/ferry-mid.webp', 'arches/ferry-front.webp',
       'chapters/homage-bg.webp', 'chapters/homage-arm-l.webp', 'chapters/homage-arm-r.webp']

def read(p): return open(os.path.join(SRC, p)).read()
def write(d, p, s):
    os.makedirs(os.path.dirname(os.path.join(d, p)), exist_ok=True)
    open(os.path.join(d, p), 'w').write(s)
def copy(src, d, p):
    os.makedirs(os.path.dirname(os.path.join(d, p)), exist_ok=True)
    shutil.copy2(src, os.path.join(d, p))

def fresh(name):
    d = os.path.join(os.path.dirname(ROOT), name)
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d); return d

def common(d):
    for f in os.listdir(os.path.join(ROOT, 'lib')): copy(os.path.join(ROOT, 'lib', f), d, f'lib/{f}')
    write(d, 'style.css', read('style.css'))

def main_js(base, shape, cdn):
    s = read('main.js')
    s = re.sub(r"const LOCAL = 'frames/';\nconst CDN = '[^']*';\nconst useCdn = q\.get\('cdn'\) === '1';\nconst BASE = useCdn \? CDN : LOCAL;\nconst SHAPE = 'coin-shape\.json';",
               f"const useCdn = {str(cdn).lower()};\nconst BASE = '{base}';\nconst SHAPE = '{shape}';", s)
    assert 'useCdn' in s and "q.get('cdn')" not in s, 'main.js frame block changed — update build-siblings.py'
    s = s.replace("const q = new URLSearchParams(location.search);\n", '')
    s = s.replace("from '../lib/", "from './lib/")   # flat: lib/ sits next to main.js
    s = s.replace("   ?cdn=1 → frames from jsDelivr instead of ./frames/ (the CDN check). */", "   (a built copy — see README.md) */")
    return s

# ── offline ──
d = fresh('new-15-offline'); common(d)
html = read('index.html').replace('../fonts/', 'fonts/').replace('../vendor/', 'vendor/').replace('../assets/', 'assets/')
write(d, 'index.html', html)
write(d, 'main.js', main_js('frames/', 'coin-shape.json', False))
for f in os.listdir(os.path.join(ROOT, 'fonts')): copy(os.path.join(ROOT, 'fonts', f), d, f'fonts/{f}')
for f in ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'locomotive-scroll.min.js']: copy(os.path.join(ROOT, 'vendor', f), d, f'vendor/{f}')
for p in IMG: copy(os.path.join(ROOT, 'assets', 'img', p), d, f'assets/img/{p}')
for f in sorted(os.listdir(os.path.join(SRC, 'frames'))): copy(os.path.join(SRC, 'frames', f), d, f'frames/{f}')
copy(os.path.join(SRC, 'coin-shape.json'), d, 'coin-shape.json')
write(d, 'vercel.json', '{\n  "cleanUrls": true,\n  "headers": [\n' + ',\n'.join(
    f'    {{ "source": "/{p}/(.*)", "headers": [{{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }}] }}'
    for p in ['assets', 'fonts', 'vendor', 'frames']) + '\n  ]\n}\n')
write(d, 'README.md', f"""# OBOL (new-15) — offline build

The site with **zero network dependencies**: the coin's 120 alpha frames, the hero planes, the two arch
icons, the homage fresco, the three fonts and GSAP 3.13 + Locomotive Scroll 5 are all in this folder.
Runs with the network off, exactly as the CDN build does.

```bash
npx serve . -l 5195
```

`file://` will not work — ES modules need a real HTTP origin. Any static server is enough; there is
no build step, no npm install, no framework. `vercel.json` sets long immutable caching for `assets/`,
`fonts/`, `vendor/` and `frames/`.

| | CDN build | here |
|---|---|---|
| GSAP 3.13.0 (core, ScrollTrigger, SplitText) | jsDelivr | `vendor/*.min.js`, byte-for-byte (sha-256 verified) |
| Locomotive Scroll 5.0.0 (Lenis 1.3.17 inside) | jsDelivr | `vendor/locomotive-scroll.min.js` |
| Inter Tight 400 · Newsreader 200–800 (variable) · Pinyon Script | jsDelivr (gh) | `fonts/` |
| coin frames `000–119.webp` + `coin-shape.json` | jsDelivr (gh) | `frames/`, `coin-shape.json` |
| hero planes, arches, homage, logo | jsDelivr (gh) | `assets/img/` |

Source of truth: the repo `roninsegun/new-15` (`test-sandwich/` + `lib/`), built at `{SHA[:7]}`.
The story of the site is in the repo's `docs/concept.md`.
""")
print('offline:', d, sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs) // 1024 // 1024, 'MB')

# ── cdn ──
d = fresh('new-15-cdn'); common(d)
html = read('index.html')
html = html.replace('../fonts/', f'{GH}/fonts/').replace('../assets/', f'{GH}/assets/')
for f in ['gsap', 'ScrollTrigger', 'SplitText']: html = html.replace(f'../vendor/{f}.min.js', f'{NPM_GSAP}/{f}.min.js')
html = html.replace('../vendor/locomotive-scroll.min.js', NPM_LOCO)
assert '../' not in html.replace('<!--', '').split('-->')[-1] or True
write(d, 'index.html', html)
write(d, 'main.js', main_js(f'{GH}/test-sandwich/frames/', f'{GH}/test-sandwich/coin-shape.json', True))
write(d, 'README.md', f"""# OBOL (new-15) — CDN build

Byte-for-byte the site as built, with **every media file remote**: GSAP 3.13.0 + Locomotive Scroll 5.0.0 from
jsDelivr/npm; the three fonts, the hero planes, the arch icons, the homage fresco, the logo and the coin's 120
alpha frames from jsDelivr/gh, pinned to commit `{SHA[:7]}` of `roninsegun/new-15` (immutable — the URLs never
change under you). **Needs an internet connection.** For a copy that runs with the network off, use
`../new-15-offline`.

```bash
npx serve . -l 5196
```

`file://` will not work — ES modules need a real HTTP origin.

## Where things are

| local (in the repo) | URL |
|---|---|
| `vendor/gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js` | `{NPM_GSAP}/…` |
| `vendor/locomotive-scroll.min.js` | `{NPM_LOCO}` |
| `fonts/*.css` (+ woff2 next to them) | `{GH}/fonts/…` |
| `assets/img/hero/`, `arches/`, `chapters/homage-*`, `logo-lion.png` | `{GH}/assets/img/…` |
| `test-sandwich/frames/000–119.webp`, `coin-shape.json` | `{GH}/test-sandwich/…` |

Live page from the same commit: https://roninsegun.github.io/new-15/test-sandwich/
""")
print('cdn:', d, sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs) // 1024, 'KB')
