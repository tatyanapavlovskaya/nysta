#!/usr/bin/env python3
"""Generate placeholder PNG icons for the Nysta extension."""

import struct, zlib, os

def make_png(size, color=(26, 26, 26)):
    """Create a minimal solid-color PNG."""
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    raw = b''
    for _ in range(size):
        row = b'\x00' + bytes(color + (255,)) * size
        raw += row

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', idat) +
            chunk(b'IEND', b''))

os.makedirs('icons', exist_ok=True)
for size in [16, 48, 128]:
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size, (26, 26, 26)))
    print(f'Created icons/icon{size}.png')
