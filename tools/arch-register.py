"""Register a re-framed cut-out back onto its master canvas.
The transparent isolations (gpt_image_2_5) sometimes re-frame the subject
(bigger, centred). This finds the scale + offset at which the cut-out best
matches the master (masked template matching, cv2 TM_SQDIFF with the alpha as
the mask, over a scale sweep) and writes the cut-out onto a full-size
transparent canvas at that place — so every layer is once again the whole
canvas and CSS keeps position:absolute; inset:0.
  python3 tools/arch-register.py <name> <L2|L3>
"""
import os, sys
import numpy as np
import cv2
from PIL import Image

NAME, LAYER = sys.argv[1], sys.argv[2]
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'src', 'arches')
src_name = {'L2': f'{NAME}-L2-mid-cut.png', 'L3': f'{NAME}-L3-front-cut.png'}[LAYER]
master = Image.open(os.path.join(D, f'{NAME}-master.png')).convert('RGB')
cut = Image.open(os.path.join(D, src_name)).convert('RGBA')
# trim the cut-out to its alpha bbox first
bbox = cut.getchannel('A').getbbox()
cut_t = cut.crop(bbox)
M = np.asarray(master.convert('L')).astype(np.float32) / 255
best = None
for s in np.arange(0.35, 1.01, 0.025):
    w = max(8, round(cut_t.width * s)); h = max(8, round(cut_t.height * s))
    if w >= M.shape[1] or h >= M.shape[0]: continue
    c = cut_t.resize((w, h), Image.LANCZOS)
    T = np.asarray(c.convert('L')).astype(np.float32) / 255
    A = (np.asarray(c.getchannel('A')).astype(np.float32) / 255)
    if A.sum() < 100: continue
    res = cv2.matchTemplate(M, T, cv2.TM_SQDIFF, mask=A)
    res = res / A.sum()                     # mean masked squared diff → comparable across scales
    y, x = np.unravel_index(np.argmin(res), res.shape)
    v = float(res[y, x])
    if best is None or v < best[0]: best = (v, s, int(x), int(y), w, h)
v, s, x, y, w, h = best
print(f'{src_name}: scale {s:.3f}  at ({x},{y})  size {w}x{h}  score {v:.4f}')
canvas = Image.new('RGBA', master.size, (0, 0, 0, 0))
canvas.alpha_composite(cut_t.resize((w, h), Image.LANCZOS), (x, y))
out = src_name.replace('-cut.png', '-reg.png')
canvas.save(os.path.join(D, out))
print('→', out)
