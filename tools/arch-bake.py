"""Bake the arch layers for the web: assets/src/arches/<name>-L1-bg.png,
<name>-L2-mid-cut.png, <name>-L3-front-cut.png → assets/img/arches/<name>-{bg,mid,front}.webp
All three are resampled to ONE canvas (the mid layer's size, capped at 1200px wide)
so they register in CSS as position:absolute; inset:0. Bright grade: sat .95."""
import os, sys

def reg(stem):
    """the registered layer if tools/arch-register.py made one, else the raw cut"""
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
    return f'{stem}-reg.png' if os.path.exists(os.path.join(d, f'{stem}-reg.png')) else f'{stem}-cut.png'
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
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(SAT)
    if alpha:
        rgb.putalpha(im.getchannel('A'))
        rgb.save(os.path.join(OUT, dst), 'WEBP', quality=90, method=6)
    else:
        rgb.save(os.path.join(OUT, dst), 'WEBP', quality=86, method=6)
    p = os.path.join(OUT, dst)
    print(f'{dst:18s} {Image.open(p).size}  {os.path.getsize(p) // 1024} KB')
