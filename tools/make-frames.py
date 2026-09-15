#!/usr/bin/env python3
"""PNG-RGBA frames → uniformly cropped, square, alpha WebP sequence.

    python3 tools/make-frames.py --src assets/video/frames-png --out test-sandwich/frames

Crop box = union of the alpha bounding boxes of ALL frames (+margin), made
square, so the object never jumps between frames. Frames are renumbered
000..N-1 (use --step 2 to keep every 2nd frame).
"""
import argparse
import os
import sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--src', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--size', type=int, default=1024)
ap.add_argument('--quality', type=int, default=80)
ap.add_argument('--margin', type=float, default=0.04, help='fraction of the box added on each side')
ap.add_argument('--alpha-min', type=int, default=8, help='alpha threshold for the bbox')
ap.add_argument('--step', type=int, default=1)
args = ap.parse_args()

names = sorted(n for n in os.listdir(args.src) if n.lower().endswith('.png'))[::args.step]
if not names:
    sys.exit('no PNG frames in ' + args.src)

# 1. union bbox over all frames
box = None
size = None
for n in names:
    im = Image.open(os.path.join(args.src, n)).convert('RGBA')
    size = im.size
    a = im.getchannel('A').point(lambda v: 255 if v >= args.alpha_min else 0)
    b = a.getbbox()
    if b is None:
        continue
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
if box is None:
    sys.exit('frames are fully transparent')

# 2. margin + square around the box centre (may exceed the image — padded transparent)
w, h = box[2] - box[0], box[3] - box[1]
side = int(max(w, h) * (1 + 2 * args.margin))
cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
crop = (int(cx - side / 2), int(cy - side / 2), int(cx - side / 2) + side, int(cy - side / 2) + side)
print(f'frames {len(names)} · source {size[0]}x{size[1]} · alpha bbox {box} · crop {crop} ({side}px)')

# 3. crop → resize → webp
os.makedirs(args.out, exist_ok=True)
total = 0
for i, n in enumerate(names):
    im = Image.open(os.path.join(args.src, n)).convert('RGBA')
    tile = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    tile.paste(im, (-crop[0], -crop[1]))
    tile = tile.resize((args.size, args.size), Image.LANCZOS)
    path = os.path.join(args.out, f'{i:03d}.webp')
    tile.save(path, 'WEBP', quality=args.quality, method=6)
    total += os.path.getsize(path)
print(f'wrote {len(names)} × {args.size}px webp → {args.out} · {total / 1e6:.1f} MB')
