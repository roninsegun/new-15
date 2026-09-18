"""Arch layers: chroma-key the flat-green layer renders, check their
registration against the master, build the review sheet.
  python3 tools/arch-layers.py <name>        name = mint | ferry
Inputs  assets/src/arches/<name>-master.png, <name>-L1-bg.png (opaque),
        <name>-L2-mid.png, <name>-L3-front.png (figures on flat #00FF00)
Outputs <name>-L2-mid-cut.png / <name>-L3-front-cut.png (RGBA, keyed),
        <name>-review.png (master · bg · mid · front · composite)
Key: green excess g - max(r, b): ~255 on the flat key, <= 0 on paint.
alpha ramps 1→0 over [T0, T1]; despill clamps g to max(r, b) on the edge."""
import os, sys

def reg(stem):
    """the registered layer if tools/arch-register.py made one, else the raw cut"""
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
    return f'{stem}-reg.png' if os.path.exists(os.path.join(d, f'{stem}-reg.png')) else f'{stem}-cut.png'
import numpy as np
from PIL import Image

NAME = sys.argv[1]
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
T0, T1 = 40, 150

def key(src):
    im0 = Image.open(os.path.join(D, src))
    if 'A' in im0.getbands():                       # GPT transparent render: real alpha, nothing to key
        res = im0.convert('RGBA')
        dst = src.replace('.png', '-cut.png'); res.save(os.path.join(D, dst)); return res, dst
    im = im0.convert('RGB')
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    excess = g - np.maximum(r, b)
    alpha = np.clip((T1 - excess) / (T1 - T0), 0, 1)
    edge = (alpha > 0) & (alpha < 1)
    g2 = g.copy(); g2[edge] = np.minimum(g[edge], np.maximum(r[edge], b[edge]))
    out = np.dstack([r, g2, b, (alpha * 255)]).astype(np.uint8)
    res = Image.fromarray(out, 'RGBA')
    dst = src.replace('.png', '-cut.png')
    res.save(os.path.join(D, dst))
    return res, dst

master = Image.open(os.path.join(D, f'{NAME}-master.png')).convert('RGB')
bg = Image.open(os.path.join(D, f'{NAME}-L1-bg.png')).convert('RGB')
mid, mid_dst = key(f'{NAME}-L2-mid.png')
front, front_dst = key(f'{NAME}-L3-front.png')
print('sizes', master.size, bg.size, mid.size, front.size)
# composite at the bg size (all renders share it); master resized for the diff
S = bg.size
comp = bg.copy().convert('RGBA')
comp.alpha_composite(mid.resize(S, Image.LANCZOS))
comp.alpha_composite(front.resize(S, Image.LANCZOS))
m = master.resize(S, Image.LANCZOS)
diff = np.abs(np.asarray(comp.convert('RGB')).astype(np.int16) - np.asarray(m).astype(np.int16)).mean()
print(f'composite vs master mean |diff| = {diff:.1f} (0 = identical)')
# review sheet
th = 520
tiles = [m, bg, mid, front, comp.convert('RGB')]
labels = ['master', 'L1 bg', 'L2 mid', 'L3 front', 'composite']
ims = []
for t in tiles:
    t = t.copy(); t.thumbnail((10000, th)); ims.append(t)
W = sum(i.width for i in ims) + 10 * (len(ims) + 1)
sheet = Image.new('RGB', (W, th + 40), (100, 0, 100))
x = 10
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for t, lab in zip(ims, labels):
    if t.mode == 'RGBA': sheet.paste(t, (x, 30), t)
    else: sheet.paste(t, (x, 30))
    d.text((x, 10), lab, fill=(255, 255, 255)); x += t.width + 10
sheet.save(os.path.join(D, f'{NAME}-review.png'))
print('sheet', sheet.size)
