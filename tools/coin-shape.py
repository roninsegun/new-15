#!/usr/bin/env python3
"""Coin silhouette → polygon for CSS shape-outside.

    python3 tools/coin-shape.py --frame test-sandwich/frames/119.webp --out test-sandwich/coin-shape.json [--rays 72]

Casts `rays` rays from the frame centre, keeps the outermost pixel with
alpha ≥ threshold on each, and writes the points as fractions of the frame
box (0..1, origin top-left) in angle order starting at 12 o'clock, clockwise.
The page scales them to the coin's on-screen box and splits them into the
left/right half-polygons for the two floats.
"""
import argparse
import json
import math
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--frame', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--rays', type=int, default=72)
ap.add_argument('--alpha-min', type=int, default=40)
args = ap.parse_args()

im = Image.open(args.frame).convert('RGBA')
a = np.array(im)[..., 3]
h, w = a.shape
ys, xs = np.nonzero(a >= args.alpha_min)
cx, cy = float(xs.mean()), float(ys.mean())          # alpha centroid, not the box centre
rmax = math.hypot(w, h)

pts = []
for i in range(args.rays):
    t = -math.pi / 2 + 2 * math.pi * i / args.rays    # 12 o'clock, clockwise (y down)
    dx, dy = math.cos(t), math.sin(t)
    best = 0.0
    r = 0.0
    while r < rmax:
        x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
        if x < 0 or y < 0 or x >= w or y >= h:
            break
        if a[y, x] >= args.alpha_min:
            best = r
        r += 1.0
    pts.append([round((cx + dx * best) / w, 4), round((cy + dy * best) / h, 4)])

out = {'centre': [round(cx / w, 4), round(cy / h, 4)], 'points': pts}
with open(args.out, 'w') as f:
    json.dump(out, f, separators=(',', ':'))
rs = [math.hypot((p[0] - cx / w), (p[1] - cy / h)) for p in pts]
print(f'{args.frame}: centre ({cx/w:.3f}, {cy/h:.3f}) · radius {min(rs):.3f}–{max(rs):.3f} of box · {len(pts)} points → {args.out}')
