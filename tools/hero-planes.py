"""Hero planes: assets/src/hero/*.png (lossless cut-outs of the master) →
assets/img/hero/*.webp, darkened per depth so the coin stays the brightest
thing in the scene (Dmitriy: back −30 %, the boat −15 %, the front planes −10 %).
Alpha is untouched. Re-run after changing DARKEN."""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'hero')
OUT = os.path.join(ROOT, 'assets', 'img', 'hero')
DARKEN = {'back': 0.30, 'mid': 0.15, 'front-l': 0.10, 'front-r': 0.10}

for name, k in DARKEN.items():
    im = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGBA')
    rgb = ImageEnhance.Brightness(im.convert('RGB')).enhance(1 - k)
    if name == 'back':
        rgb.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=85, method=6)
    else:
        rgb.putalpha(im.getchannel('A'))
        rgb.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=82, method=6)
    print(f'{name:8s} -{k:.0%}  {os.path.getsize(os.path.join(OUT, f"{name}.webp")) // 1024} KB')
