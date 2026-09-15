#!/usr/bin/env python3
"""Recover an alpha matte from a background-removed video that was composited
on BLACK, using the original (flat-background) video of the same length.

    python3 tools/matte-from-black.py --src coin-src.mp4 --cut coin-cut.mp4 --out frames-png [--frames 120]

Per pixel: cut = fg·α (blend to black), src ≈ fg·α + bg·(1−α) with bg = the
flat backdrop. α ≈ luma(cut)/luma(src), remapped so the ~5 % encoder drift
inside the object still reads as fully opaque; the edge colour is
un-premultiplied against the measured backdrop so there is no grey fringe.
Writes PNG RGBA frames 000.png … to --out.
"""
import argparse
import os
import subprocess
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--src', required=True, help='original clip (flat backdrop)')
ap.add_argument('--cut', required=True, help='background-removed clip (black backdrop)')
ap.add_argument('--out', required=True)
ap.add_argument('--frames', type=int, default=0, help='max frames to write (0 = all)')
ap.add_argument('--lo', type=float, default=0.12, help='luma ratio → alpha 0')
ap.add_argument('--hi', type=float, default=0.80, help='luma ratio → alpha 1')
args = ap.parse_args()


def probe(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height', '-of', 'csv=p=0', path]).decode().strip()
    w, h = (int(x) for x in out.split(','))
    return w, h


def reader(path, w, h):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    p.stdout.close()
    p.wait()


def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


w, h = probe(args.src)
assert (w, h) == probe(args.cut), 'src and cut differ in size'
os.makedirs(args.out, exist_ok=True)

count = 0
for src, cut in zip(reader(args.src, w, h), reader(args.cut, w, h)):
    if args.frames and count >= args.frames:
        break
    ls = luma(src.astype(np.float32))
    lc = luma(cut.astype(np.float32))
    ratio = lc / np.maximum(ls, 1.0)
    alpha = np.clip((ratio - args.lo) / (args.hi - args.lo), 0.0, 1.0)

    # backdrop colour = median of the clearly-transparent pixels of this frame
    bg_mask = alpha < 0.02
    bg = np.median(src[bg_mask].reshape(-1, 3), axis=0) if bg_mask.any() else np.array([128, 128, 128])

    # un-premultiply the edge: fg = (src − bg·(1−α)) / α
    a3 = alpha[..., None]
    fg = (src.astype(np.float32) - bg * (1.0 - a3)) / np.maximum(a3, 0.05)
    fg = np.where(a3 >= 0.98, src.astype(np.float32), fg)
    fg = np.clip(fg, 0, 255)

    rgba = np.dstack([fg, alpha * 255.0]).astype(np.uint8)
    rgba[alpha < 0.005] = 0
    Image.fromarray(rgba, 'RGBA').save(os.path.join(args.out, f'{count:03d}.png'))
    count += 1

print(f'wrote {count} RGBA frames → {args.out}')
