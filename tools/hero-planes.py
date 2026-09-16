"""Hero planes: assets/src/hero/*.png (lossless cut-outs of the master) →
assets/img/hero/*.webp.
- darkened per depth so the coin stays the brightest thing in the scene
  (Dmitriy: back −55 %, the boat −35 %, the front planes −25 % — "значительно
  темнее", the order matters);
- saturation −55 % on every plane ("слишком акцентные" → "ещё чуть-чуть" → "прям значительно");
- the boat plane fades out towards its bottom (alpha × vertical ramp: 1 down
  to FADE[0] of the height, 0 from FADE[1]) so its patch of water sinks into
  the back plane's water instead of peeling off it as the boat recedes.
Re-run after changing DARKEN / SAT / FADE."""
import os
from PIL import Image, ImageChops, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'hero')
OUT = os.path.join(ROOT, 'assets', 'img', 'hero')
DARKEN = {'back': 0.55, 'mid': 0.35, 'front-l': 0.25, 'front-r': 0.25}
SAT = 0.45
FADE = {'mid': (0.60, 0.86)}


def ramp(size, y0, y1):
    """'L' mask: 255 above y0·H, linear down to 0 at y1·H, 0 below."""
    w, h = size
    a, b = round(y0 * h), round(y1 * h)
    col = bytes(255 if y < a else 0 if y >= b else round(255 * (b - y) / (b - a)) for y in range(h))
    return Image.frombytes('L', (1, h), col).resize((w, h), Image.NEAREST)


for name, k in DARKEN.items():
    im = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGBA')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(SAT)
    rgb = ImageEnhance.Brightness(rgb).enhance(1 - k)
    if name == 'back':
        rgb.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=85, method=6)
    else:
        alpha = im.getchannel('A')
        if name in FADE:
            alpha = ImageChops.multiply(alpha, ramp(im.size, *FADE[name]))
        rgb.putalpha(alpha)
        rgb.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=82, method=6)
    print(f'{name:8s} -{k:.0%}  {os.path.getsize(os.path.join(OUT, f"{name}.webp")) // 1024} KB')
