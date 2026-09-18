"""Mosaic 2.0 assets: assets/src/chapters → assets/img/chapters (webp).
Bright renaissance direction (Dmitriy): no darkening, near-full saturation —
the paintings should glow against the black. Opaque plates and alpha layers:
- mint / ferry: the two arch paintings (3:4)
- homage-bg: the armless fresco (16:9)
- mint-fig / ferry-fig: overflow cut-outs — SAME canvas as their source crop,
  never trimmed (CSS registers them over the arch by canvas fractions)
- homage-arm-l/r: the two arms, trimmed to their alpha bbox (+8px)
Re-run after swapping any source."""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'chapters')
OUT = os.path.join(ROOT, 'assets', 'img', 'chapters')
SAT = 0.95

def grade(im):
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(SAT)
    return rgb

def plate(src, dst):
    im = Image.open(os.path.join(SRC, src))
    grade(im).save(os.path.join(OUT, dst), 'WEBP', quality=88, method=6)
    report(dst)

def layer(src, dst, trim=False):
    im = Image.open(os.path.join(SRC, src)).convert('RGBA')
    if trim:
        x0, y0, x1, y1 = im.getchannel('A').getbbox()
        im = im.crop((max(0, x0 - 8), max(0, y0 - 8), min(im.width, x1 + 8), min(im.height, y1 + 8)))
    rgb = grade(im)
    rgb.putalpha(im.getchannel('A'))
    rgb.save(os.path.join(OUT, dst), 'WEBP', quality=92, method=6)
    report(dst)

def report(dst):
    p = os.path.join(OUT, dst)
    print(f'{dst:18s} {Image.open(p).size}  {os.path.getsize(p) // 1024} KB')

plate('cand-a1.png', 'mint.webp')
plate('cand-b2.png', 'ferry.webp')
plate('homage-bg.png', 'homage-bg.webp')
layer('cut-mint-fig.png', 'mint-fig.webp')
layer('cut-ferry-fig.png', 'ferry-fig.webp')
layer('cut-arm-l.png', 'homage-arm-l.webp', trim=True)
layer('cut-arm-r.png', 'homage-arm-r.webp', trim=True)
