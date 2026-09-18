"""Mosaic 2.0 assets (honest layers) + the homage → assets/img/chapters/*.webp.
Bright renaissance direction: near-full saturation, no darkening.
- *-fon: opaque arch backgrounds (downscaled to 1200x1600)
- *-old / *-boy / *-girl: alpha cut-outs (removebg), trimmed to bbox+8px,
  capped at 1600px on the long side
- homage-bg / homage-arm-l / homage-arm-r: as before
Re-run after swapping any source in assets/src/chapters."""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'chapters')
OUT = os.path.join(ROOT, 'assets', 'img', 'chapters')
SAT = 0.95

def grade(im):
    return ImageEnhance.Color(im.convert('RGB')).enhance(SAT)

def report(dst):
    p = os.path.join(OUT, dst)
    print(f'{dst:20s} {Image.open(p).size}  {os.path.getsize(p) // 1024} KB')

def plate(src, dst, size=(1200, 1600)):
    im = Image.open(os.path.join(SRC, src))
    im.thumbnail((size[0], size[1]), Image.LANCZOS)
    grade(im).save(os.path.join(OUT, dst), 'WEBP', quality=88, method=6)
    report(dst)

def layer(src, dst, cap=1600, crop=None, erase=()):
    """crop: fractional (x0, y0, x1, y1) cut BEFORE the bbox trim; erase:
    fractional rects (of the TRIMMED canvas) whose alpha is zeroed — both kill
    the half-erased neighbour figures the generator leaves at a group's edge
    (any seam hides under the adjacent layer in the arch)."""
    im = Image.open(os.path.join(SRC, src)).convert('RGBA')
    if crop:
        W, H = im.size
        im = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
    bbox = im.getchannel('A').getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        im = im.crop((max(0, x0 - 8), max(0, y0 - 8), min(im.width, x1 + 8), min(im.height, y1 + 8)))
    if erase:
        from PIL import ImageDraw
        a = im.getchannel('A')
        d = ImageDraw.Draw(a)
        W, H = im.size
        for (ex0, ey0, ex1, ey1) in erase:
            d.rectangle((int(ex0 * W), int(ey0 * H), int(ex1 * W), int(ey1 * H)), fill=0)
        im.putalpha(a)
    im.thumbnail((cap, cap), Image.LANCZOS)
    rgb = grade(im)
    rgb.putalpha(im.getchannel('A'))
    rgb.save(os.path.join(OUT, dst), 'WEBP', quality=92, method=6)
    report(dst)

# the old chapter plates (mint-*/ferry-*) are gone — the arches replaced them (assets/img/arches, tools/arch-*.py)
plate('homage-bg.png', 'homage-bg.webp', size=(1344, 752))
layer('cut-arm-l.png', 'homage-arm-l.webp')
layer('cut-arm-r.png', 'homage-arm-r.webp')
