"""Render an arch exactly as the site composes it: bg and front clipped to the
3:4 semicircle window at the canvas bottom, the mid layer unclipped, on black.
  python3 tools/arch-preview.py <name>   → assets/src/arches/<name>-arch-preview.png"""
import os, sys

def reg(stem):
    """the registered layer if tools/arch-register.py made one, else the raw cut"""
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
    return f'{stem}-reg.png' if os.path.exists(os.path.join(d, f'{stem}-reg.png')) else f'{stem}-cut.png'
from PIL import Image, ImageDraw

NAME = sys.argv[1]
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
bg = Image.open(os.path.join(D, f'{NAME}-L1-bg.png')).convert('RGBA')
mid = Image.open(os.path.join(D, reg(f'{NAME}-L2-mid'))).convert('RGBA')
front = Image.open(os.path.join(D, reg(f'{NAME}-L3-front'))).convert('RGBA')
S = mid.size
bg = bg.resize(S, Image.LANCZOS); front = front.resize(S, Image.LANCZOS)
W, H = S
ah = round(W * 4 / 3); top = H - ah; r = W // 2
mask = Image.new('L', S, 0)
d = ImageDraw.Draw(mask)
d.rectangle((0, top + r, W, H), fill=255)
d.pieslice((0, top, W - 1, top + 2 * r), 180, 360, fill=255)

def clipped(layer):
    a = layer.getchannel('A')
    a = Image.fromarray((__import__('numpy').asarray(a).astype('uint16') * __import__('numpy').asarray(mask) // 255).astype('uint8'))
    out = layer.copy(); out.putalpha(a); return out

canvas = Image.new('RGBA', S, (0, 0, 0, 255))
canvas.alpha_composite(clipped(bg))
canvas.alpha_composite(mid)
canvas.alpha_composite(clipped(front))
out = canvas.convert('RGB'); out.thumbnail((700, 1240))
out.save(os.path.join(D, f'{NAME}-arch-preview.png')); print(out.size)
