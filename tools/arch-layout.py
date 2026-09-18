"""Place the arch layers the way Dmitriy laid them out in Figma.
Canvas = W × 1.586W; arch = bottom 3:4 (top at 0.253W); each layer is our
full-canvas render (assets/img/arches/<name>-<layer>.webp, 1200×2122) placed
at left/top/width in canvas units (fractions of W). Landmarks in OUR layers
are measured from the alpha; landmarks in HIS frames are the constants below
(fractions of his frame, read off the Figma screenshots). Two landmarks per
layer fix scale + offset. Prints the CSS custom properties and writes a
site-accurate preview per arch.
  python3 tools/arch-layout.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'assets', 'img', 'arches')
OUT = os.path.join(ROOT, 'assets', 'src', 'arches')
HC = 1.586            # canvas height / width
ARCH_TOP = HC - 4 / 3 # 0.2527 — the arch window's top in canvas units
AH = 4 / 3            # arch height in canvas units
A = 2122 / 1200       # our layer aspect (height / width)

def alpha(name):
    im = Image.open(os.path.join(IMG, name)).convert('RGBA')
    return im, np.asarray(im.getchannel('A')) > 128

def bbox(m):
    ys, xs = np.where(m)
    return xs.min(), ys.min(), xs.max(), ys.max()

def arch_y(f):           # fraction of the ARCH height → canvas units
    return ARCH_TOP + f * AH

css = {}

# ── Struck ──
im, m = alpha('mint-mid.webp'); h, w = m.shape
x0, y0, x1, y1 = bbox(m)
bx0, bx1, by0 = x0 / w, (x1 + 1) / w, y0 / h
# his frame 46 (= the canvas): boy spans x .005–.58, hammer top at y .016 of the canvas
W_ = (0.58 - 0.005) / (bx1 - bx0); L_ = 0.005 - bx0 * W_; T_ = 0.016 * HC - by0 * A * W_
css['mint-mid'] = (L_, T_, W_)
print(f'mint-mid  boy bbox x {bx0:.3f}–{bx1:.3f} top {by0:.3f} → w {W_:.3f} l {L_:.3f} t {T_:.3f}  feet at {T_ + (y1/h)*A*W_:.3f} (canvas h {HC})')

im, m = alpha('mint-front.webp'); h, w = m.shape
x0, y0, x1, y1 = bbox(m)
rows = m.sum(axis=1); wide = np.where(rows >= 0.8 * rows.max())[0]; table_edge = int(wide.max()) / h   # lowest wide row = the bottom of the table's apron
head_row = m[y0 + int(0.01 * h)]; xs = np.where(head_row)[0]; head_cx = xs.mean() / w
by0 = y0 / h
# his frame 47 (= the arch): head top at .12, table front edge at .957 of the arch height, head centre x at .886
scale_h = (arch_y(0.957) - arch_y(0.12)) / ((table_edge - by0) * A)   # = W_
W_ = scale_h; T_ = arch_y(0.12) - by0 * A * W_; L_ = 0.886 - head_cx * W_
css['mint-front'] = (L_, T_, W_)
print(f'mint-front head top {by0:.3f} table edge {table_edge:.3f} head cx {head_cx:.3f} → w {W_:.3f} l {L_:.3f} t {T_:.3f}')
css['mint-bg'] = (0, 0, 1)

# ── Refused ──
im, m = alpha('ferry-mid.webp'); h, w = m.shape
x0, y0, x1, y1 = bbox(m)
top_row = m[y0 + int(0.005 * h)]; xs = np.where(top_row)[0]; pole_x = xs.mean() / w; pole_y = y0 / h
prow_x = x0 / w
# his frame 52 (= the canvas): pole top at (.943, 0), boat prow at x .143
W_ = (0.943 - 0.143) / (pole_x - prow_x); L_ = 0.143 - prow_x * W_; T_ = 0 - pole_y * A * W_
css['ferry-mid'] = (L_, T_, W_)
print(f'ferry-mid pole ({pole_x:.3f},{pole_y:.3f}) prow {prow_x:.3f} → w {W_:.3f} l {L_:.3f} t {T_:.3f}  boat bottom at {T_ + (y1/h)*A*W_:.3f}')

im, m = alpha('ferry-front.webp'); h, w = m.shape
x0, y0, x1, y1 = bbox(m)
right_col = m[:, x1 - int(0.003 * w)]; ys = np.where(right_col)[0]; hand_y = ys.mean() / h
by0, bx1 = y0 / h, (x1 + 1) / w
# his frame 53 (= the arch): head top at y .413, hand tip at (.523, .554) of the arch
W_ = (arch_y(0.554) - arch_y(0.413)) / ((hand_y - by0) * A); T_ = arch_y(0.413) - by0 * A * W_; L_ = 0.523 - bx1 * W_
css['ferry-front'] = (L_, T_, W_)
print(f'ferry-front head top {by0:.3f} hand ({bx1:.3f},{hand_y:.3f}) → w {W_:.3f} l {L_:.3f} t {T_:.3f}')
css['ferry-bg'] = (0, 0, 1)

print('\ninline style per <img> (all in % of the canvas width; --t is measured from the CANVAS top —')
print('the CSS subtracts the arch top for clipped layers):')
for k, (l, t, wdt) in css.items():
    print(f'  {k:12s} style="--l:{l*100:.2f}%;--t:{t*100:.2f}%;--w:{wdt*100:.2f}%"')

# ── previews: composite exactly as CSS will ──
S = 600
for name in ('mint', 'ferry'):
    canvas = Image.new('RGBA', (S, round(S * HC)), (0, 0, 0, 255))
    mask = Image.new('L', canvas.size, 0); d = ImageDraw.Draw(mask)
    top = round(ARCH_TOP * S); r = S // 2
    d.rectangle((0, top + r, S, canvas.size[1]), fill=255); d.pieslice((0, top, S - 1, top + 2 * r), 180, 360, fill=255)
    for layer, clipped in (('bg', True), ('mid', False), ('front', True)):
        l, t, wdt = css[f'{name}-{layer}']
        im = Image.open(os.path.join(IMG, f'{name}-{layer}.webp')).convert('RGBA')
        dw = round(wdt * S); im = im.resize((dw, round(dw * A)), Image.LANCZOS)
        lay = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); lay.alpha_composite(im, (round(l * S), round(t * S)))
        if clipped:
            a = np.asarray(lay.getchannel('A')).astype(np.uint16) * np.asarray(mask) // 255
            lay.putalpha(Image.fromarray(a.astype(np.uint8)))
        canvas.alpha_composite(lay)
    canvas.convert('RGB').save(os.path.join(OUT, f'{name}-layout-preview.png'))
print('previews written')
