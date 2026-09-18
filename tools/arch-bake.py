"""Bake the arch layers for the web: assets/src/arches/<name>-L1-bg.png,
<name>-L2-mid-cut.png, <name>-L3-front-cut.png → assets/img/arches/<name>-{bg,mid,front}.webp
All three are resampled to ONE canvas (the mid layer's size, capped at 1200px wide)
so they register in CSS as position:absolute; inset:0. Bright grade: sat .95."""
import os, sys

def reg(stem):
    """the RAW GPT cut-out: it frames the figure large (more pixels); the
    layout (tools/arch-layout.py) places layers by landmarks, so registration
    to the master no longer matters"""
    return f'{stem}-cut.png'
from PIL import Image, ImageEnhance

NAME = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'arches')
OUT = os.path.join(ROOT, 'assets', 'img', 'arches')
SAT = 0.95
mid = Image.open(os.path.join(SRC, reg(f'{NAME}-L2-mid'))).convert('RGBA')
W = min(1200, mid.width); H = round(mid.height * W / mid.width)
for src, dst, alpha in ((f'{NAME}-L1-bg.png', f'{NAME}-bg.webp', False),
                        (reg(f'{NAME}-L2-mid'), f'{NAME}-mid.webp', True),
                        (reg(f'{NAME}-L3-front'), f'{NAME}-front.webp', True)):
    im = Image.open(os.path.join(SRC, src)).convert('RGBA').resize((W, H), Image.LANCZOS)
    if dst == 'ferry-mid.webp':
        # waterline: the cut-out draws the whole hull; sink its lowest 14 % into the painted water
        from PIL import ImageChops
        a = im.getchannel('A'); x0, y0, x1, y1 = a.getbbox(); bh = y1 - y0
        ya, yb = round(y1 - 0.14 * bh), round(y1 - 0.02 * bh)
        col = bytes(255 if y < ya else 0 if y >= yb else round(255 * (yb - y) / (yb - ya)) for y in range(H))
        im.putalpha(ImageChops.multiply(a, Image.frombytes('L', (1, H), col).resize((W, H), Image.NEAREST)))
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(SAT)
    if alpha:
        rgb.putalpha(im.getchannel('A'))
        rgb.save(os.path.join(OUT, dst), 'WEBP', quality=90, method=6)
    else:
        rgb.save(os.path.join(OUT, dst), 'WEBP', quality=86, method=6)
    p = os.path.join(OUT, dst)
    print(f'{dst:18s} {Image.open(p).size}  {os.path.getsize(p) // 1024} KB')
