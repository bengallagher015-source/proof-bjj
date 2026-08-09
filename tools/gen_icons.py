#!/usr/bin/env python3
"""PROOF icon generator — pure stdlib PNG writer.
Ink background + belt-gold crossing bands (the PROOF mark)."""
import zlib, struct, os, sys

INK = (10, 13, 18)
ACC = (230, 187, 79)     # black-belt gold — brand-neutral across belts
ACC2 = (242, 212, 136)

def in_band(x, y, s, p1, p2, hw):
    (x1, y1), (x2, y2) = p1, p2
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / L2))
    px, py = x1 + t * dx, y1 + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5 <= hw

def make(size, path):
    s = size / 40.0
    r = size * 0.22
    px = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # rounded-square bg
            cx = min(max(x, r), size - r); cy = min(max(y, r), size - r)
            inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r or (r <= x <= size - r) or (r <= y <= size - r)
            c = INK
            if in_band(x, y, s, (13 * s, 10 * s), (34 * s, 26 * s), 4.6 * s):
                c = (int(ACC[0] * .55 + INK[0] * .45), int(ACC[1] * .55 + INK[1] * .45), int(ACC[2] * .55 + INK[2] * .45))
            if in_band(x, y, s, (6 * s, 26 * s), (27 * s, 9.5 * s), 4.6 * s):
                c = ACC if y > size * 0.42 else ACC2
            row += bytes(c)
        px.append(bytes(row))
    raw = b''.join(px)
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print(f'wrote {path} ({size}x{size})')

out = sys.argv[1] if len(sys.argv) > 1 else 'icons'
os.makedirs(out, exist_ok=True)
for sz in (180, 192, 512):
    make(sz, os.path.join(out, f'icon-{sz}.png'))
