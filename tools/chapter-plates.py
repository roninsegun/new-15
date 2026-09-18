"""Chapter plates: assets/src/chapters/{1..4}.png (gpt_image_2_5, 3:4) →
assets/img/chapters/{1..4}.webp. Same grade as the hero planes so the coin
stays the brightest thing on the page: saturation ×SAT, brightness ×(1−DARKEN).
No alpha — the plates are rectangular paintings. Re-run after changing knobs."""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src', 'chapters')
OUT = os.path.join(ROOT, 'assets', 'img', 'chapters')
SAT = 0.45
DARKEN = 0.2

for n in ('1', '2', '3', '4'):
    im = Image.open(os.path.join(SRC, f'{n}.png')).convert('RGB')
    im = ImageEnhance.Color(im).enhance(SAT)
    im = ImageEnhance.Brightness(im).enhance(1 - DARKEN)
    im.save(os.path.join(OUT, f'{n}.webp'), 'WEBP', quality=85, method=6)
    print(f'{n}  {im.size}  {os.path.getsize(os.path.join(OUT, f"{n}.webp")) // 1024} KB')
