#!/usr/bin/env python3
"""c64tape — reading a C64 `.tap` image: pulses and the KERNAL's own blocks.

Shared (R-008) by the C64 projects that load from tape. It knows the two
things every tape has in common — the `C64-TAPE-RAW` container and the
**standard KERNAL encoding** that carries the first program (the loader) —
and nothing about any turbo: a turbo is a property of one game, its decoder
lives in the project (`r-type/tools/rtlib.py`) and uses `pulses()` from here.

    from c64tape import pulses, kernal_blocks, kernal_files
    p = pulses('sources/tape/game.tap')   # widths in cycles
    for f in kernal_files(p): print(f['name'], hex(f['start']), len(f['data']))

CLI:
    c64tape.py IMAGE            # pulse histogram and the KERNAL files
    c64tape.py IMAGE --save DIR # the KERNAL files as DIR/<n>_<name>.prg
"""
import argparse, os
from collections import Counter

# ★ the KERNAL's pulse classes in TAP units (cycles / 8): short $30, medium
# $42, long $56 nominally; the borders lie halfway between them
KS, KM, KL = 'S', 'M', 'L'


def pulses(path):
    """Pulse widths in cycles. Version 0 stores an overflow as a zero byte,
    version 1 as a zero followed by 24 bits of cycles."""
    d = open(path, 'rb').read()
    if d[:12] != b'C64-TAPE-RAW':
        raise ValueError('%s: not a C64-TAPE-RAW image' % path)
    ver, p, out = d[12], 20, []
    while p < len(d):
        b = d[p]; p += 1
        if b:
            out.append(b*8)
        elif ver >= 1:
            out.append(int.from_bytes(d[p:p+3], 'little')); p += 3
        else:
            out.append(256*8)
    return out


def kernal_class(cycles):
    w = cycles // 8
    if 0x24 <= w < 0x37: return KS
    if 0x37 <= w < 0x4a: return KM
    if 0x4a <= w < 0x64: return KL
    return None


def kernal_blocks(p):
    """Every run of KERNAL bytes: (first pulse, [bytes]). A byte is a marker
    (L, M), eight data bits and a parity bit, each bit a pulse pair:
    (S, M) = 0, (M, S) = 1, least significant first."""
    c = [kernal_class(w) for w in p]
    out, i = [], 0
    while i < len(c) - 1:
        if c[i] == KL and c[i+1] == KM:
            start, data, j = i, [], i
            while j + 19 < len(c) and c[j] == KL and c[j+1] == KM:
                bits = []
                for k in range(9):
                    pair = (c[j+2+2*k], c[j+3+2*k])
                    if pair == (KS, KM): bits.append(0)
                    elif pair == (KM, KS): bits.append(1)
                    else: break
                if len(bits) < 9 or (sum(bits[:8]) + bits[8]) % 2 != 1:
                    break
                data.append(sum(b << n for n, b in enumerate(bits[:8])))
                j += 20
            if len(data) >= 10:
                out.append((start, data))
            i = j + 1 if j > i else i + 1
        else:
            i += 1
    return out


def kernal_files(p):
    """Header + data pairs as the KERNAL writes them (each block twice, with
    the countdown $89..$81 and then $09..$01). Checks the XOR byte and that
    both copies agree."""
    blocks = kernal_blocks(p)
    files, hdr = [], None
    for start, b in blocks:
        sync, body, ck = b[:9], b[9:-1], b[-1]
        x = 0
        for v in body: x ^= v
        ok = x == ck
        if sync[0] == 0x09:
            continue                       # the repeat, compared below
        rep = next((bb for s, bb in blocks if s > start and bb[0] == 0x09), None)
        same = rep is not None and rep[9:] == b[9:]
        if hdr is None and len(body) == 192 and body[0] in (1, 3, 4):
            hdr = dict(type=body[0], start=body[1] | body[2] << 8, end=body[3] | body[4] << 8,
                       name=bytes(body[5:21]).rstrip(b' ').decode('latin-1'),
                       pulse=start, ok=ok, same=same)
        elif hdr is not None:
            hdr.update(data=bytes(body), data_ok=ok, data_same=same)
            files.append(hdr); hdr = None
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('image')
    ap.add_argument('--save', metavar='DIR')
    a = ap.parse_args()
    p = pulses(a.image)
    h = Counter(min(w//8, 255) for w in p)
    print('%d pulses; widths (cycles/8) seen more than 100 times:' % len(p))
    for k in sorted(h):
        if h[k] > 100: print('  $%02X %8d' % (k, h[k]))
    for n, f in enumerate(kernal_files(p)):
        print('KERNAL file %d: "%s" type %d $%04X-$%04X (%d B) at pulse %d, '
              'checksum %s/%s, copies %s/%s'
              % (n, f['name'], f['type'], f['start'], f['end'], len(f['data']), f['pulse'],
                 f['ok'], f['data_ok'], f['same'], f['data_same']))
        if a.save:
            os.makedirs(a.save, exist_ok=True)
            open(os.path.join(a.save, '%d_%s.prg' % (n, f['name'] or 'noname')), 'wb').write(
                bytes([f['start'] & 255, f['start'] >> 8]) + f['data'])


if __name__ == '__main__':
    main()
