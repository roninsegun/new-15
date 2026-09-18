"""Hero 2 planes from one master (assets/src/hero2/master-v1.png, 16:9):
  bg.png            opaque repaint without the figures (Nano Banana edit)
  mid.png           GPT-2.5 transparent isolation: the ferryman + boat
  front-r.png       …: the pole
  front-l.png       …: the draped foreground figure
Each isolation may be re-framed by the generator, so it is REGISTERED onto
the master (masked template matching over a scale sweep, cv2) and written
back onto the full canvas; then everything is graded and baked to
assets/img/hero/{back,mid,front-l,front-r}.webp — the same names the hero
choreography in main.js already uses. A review sheet + composite is written
to assets/src/hero2/review.png.
  python3 tools/hero-layers.py            (register + bake + review)
"""
import os
import numpy as np
import cv2
from PIL import Image, ImageChops, ImageDraw, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'hero2')
OUT = os.path.join(ROOT, 'assets', 'img', 'hero')
SAT = 0.95
DARKEN = {'back': 0.15, 'mid': 0.05, 'front-l': 0.0, 'front-r': 0.0}   # per depth; the coin must stay the brightest thing
FADE_MID = (0.86, 0.97)   # the boat's hull sinks into the bg water (fractions of the boat's own alpha bbox height)

master = Image.open(os.path.join(SRC, 'master-v1.png')).convert('RGB')
MW, MH = master.size
M = np.asarray(master.convert('L')).astype(np.float32) / 255

def register(src, scales=np.arange(0.5, 1.26, 0.025)):
    cut = Image.open(os.path.join(SRC, src)).convert('RGBA')
    bbox = cut.getchannel('A').getbbox(); cut_t = cut.crop(bbox)
    best = None
    for s in scales:
        w = round(cut_t.width * s); h = round(cut_t.height * s)
        if w < 8 or h < 8 or w > MW or h > MH: continue
        c = cut_t.resize((w, h), Image.LANCZOS)
        T = np.asarray(c.convert('L')).astype(np.float32) / 255
        A = np.asarray(c.getchannel('A')).astype(np.float32) / 255
        if A.sum() < 100: continue
        res = cv2.matchTemplate(M, T, cv2.TM_SQDIFF, mask=A) / A.sum()
        y, x = np.unravel_index(np.argmin(res), res.shape); v = float(res[y, x])
        if best is None or v < best[0]: best = (v, s, int(x), int(y), w, h)
    v, s, x, y, w, h = best
    print(f'{src:12s} scale {s:.3f} at ({x},{y}) {w}x{h} score {v:.4f}')
    canvas = Image.new('RGBA', master.size, (0, 0, 0, 0))
    canvas.alpha_composite(cut_t.resize((w, h), Image.LANCZOS), (x, y))
    return canvas

def grade(im, k):
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(SAT)
    return ImageEnhance.Brightness(rgb).enhance(1 - k)

layers = {}
bg = Image.open(os.path.join(SRC, 'bg.png')).convert('RGB').resize(master.size, Image.LANCZOS)
layers['back'] = bg.convert('RGBA')
layers['mid'] = register('mid.png')
layers['front-r'] = register('front-r.png')
layers['front-l'] = register('front-l.png')

# the boat's waterline: fade the lowest part of the mid layer's bbox
a = layers['mid'].getchannel('A'); x0, y0, x1, y1 = a.getbbox(); bh = y1 - y0
ya, yb = round(y0 + FADE_MID[0] * bh), round(y0 + FADE_MID[1] * bh)
col = bytes(255 if y < ya else 0 if y >= yb else round(255 * (yb - y) / (yb - ya)) for y in range(MH))
layers['mid'].putalpha(ImageChops.multiply(a, Image.frombytes('L', (1, MH), col).resize((MW, MH), Image.NEAREST)))

os.makedirs(OUT, exist_ok=True)
for name, im in layers.items():
    g = grade(im, DARKEN[name])
    if name == 'back':
        g.save(os.path.join(OUT, 'back.webp'), 'WEBP', quality=86, method=6)
    else:
        g.putalpha(im.getchannel('A')); g.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=90, method=6)
    p = os.path.join(OUT, f'{name}.webp'); print(f'{name:8s} {Image.open(p).size} {os.path.getsize(p)//1024} KB')

# review: master · back · mid · front-l · front-r · composite (graded, on black)
comp = Image.new('RGBA', master.size, (0, 0, 0, 255))
for name in ('back', 'mid', 'front-l', 'front-r'):
    comp.alpha_composite(Image.open(os.path.join(OUT, f'{name}.webp')).convert('RGBA'))
tiles = [master, layers['back'].convert('RGB'), layers['mid'], layers['front-l'], layers['front-r'], comp.convert('RGB')]
labels = ['master', 'back', 'mid', 'front-l', 'front-r', 'composite']
th = 300; ims = []
for t in tiles:
    t = t.copy(); t.thumbnail((10000, th)); ims.append(t)
sheet = Image.new('RGB', (ims[0].width * 3 + 40, th * 2 + 70), (100, 0, 100)); d = ImageDraw.Draw(sheet)
for i, (t, lab) in enumerate(zip(ims, labels)):
    x = 10 + (i % 3) * (ims[0].width + 10); y = 25 + (i // 3) * (th + 30)
    if t.mode == 'RGBA': sheet.paste(t, (x, y), t)
    else: sheet.paste(t, (x, y))
    d.text((x, y - 15), lab, fill=(255, 255, 255))
sheet.save(os.path.join(SRC, 'review.png')); print('review', sheet.size)
