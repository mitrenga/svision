#!/usr/bin/env python3
"""Reference for ZXRomDraw out of the real 48K ROM.

    tools/retro/romdrawref.py

Runs the ROM's own PIXEL-ADD ($22AA), PLOT-SUB ($22E5) and DRAW-LINE ($24BA)
in SkoolKit's Z80 simulator on a screen with a fixed pattern, for a set of
cases (directions, lengths, OVER / INVERSE / INK 9 / PAPER 9, MASK-T), and
prints for each the checksum of the 6912 bytes of the screen and COORDS —
the expected values tools/checkzx.mjs compares svision's ZXRomDraw with.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
# SkoolKit lives in sources/ (out of git); tools/retro/fetchsources.py fetches it
SKOOLKIT = os.path.join(HERE, '..', '..', 'sources', 'skoolkit')
sys.path.insert(0, SKOOLKIT)
from skoolkit.simulator import Simulator          # noqa: E402

ROM = open(os.path.join(SKOOLKIT, 'skoolkit', 'resources', '48.rom'), 'rb').read()
A, B, C, D, E, H, L, IYh, IYl, SP, PC = 0, 2, 3, 4, 5, 6, 7, 10, 11, 12, 24

# (name, routine, start x, start y, B, C, D, E, P_FLAG, ATTR_T, MASK_T)
CASES = [
    ('plot 0,0', 'plot', 0, 0, 0, 0, 0, 0, 0x00, 0x38, 0x00),
    ('plot 255,175', 'plot', 0, 0, 175, 255, 0, 0, 0x00, 0x47, 0x00),
    ('plot over', 'plot', 0, 0, 100, 37, 0, 0, 0x01, 0x16, 0x00),
    ('plot inverse', 'plot', 0, 0, 33, 200, 0, 0, 0x04, 0x29, 0xF0),
    ('plot ink9 paper9', 'plot', 0, 0, 77, 77, 0, 0, 0x50, 0x0A, 0x00),
    ('line up', 'line', 128, 40, 60, 0, 1, 1, 0x00, 0x47, 0x00),
    ('line down', 'line', 128, 140, 60, 0, 0xFF, 1, 0x00, 0x47, 0x00),
    ('line right', 'line', 10, 88, 0, 200, 1, 1, 0x00, 0x30, 0x00),
    ('line left', 'line', 250, 88, 0, 200, 1, 0xFF, 0x00, 0x30, 0x00),
    ('line shallow +', 'line', 0, 0, 37, 250, 1, 1, 0x00, 0x05, 0x00),
    ('line steep -', 'line', 255, 175, 170, 61, 0xFF, 0xFF, 0x00, 0x05, 0x00),
    ('line diagonal', 'line', 20, 20, 100, 100, 1, 1, 0x00, 0x44, 0x00),
    ('line steep + -', 'line', 200, 10, 150, 99, 1, 0xFF, 0x01, 0x38, 0x07),
    ('line shallow - +', 'line', 3, 170, 13, 251, 0xFF, 1, 0x04, 0x20, 0x00),
    ('line over twice', 'line2', 60, 60, 50, 50, 1, 1, 0x01, 0x38, 0x00),
    ('line zero', 'line', 99, 99, 0, 0, 1, 1, 0x00, 0x38, 0x00),
]


def pattern():
    mem = bytearray(65536)
    mem[0:0x4000] = ROM
    for i in range(6144):
        mem[0x4000 + i] = (i * 37 + (i >> 5)) & 0xFF
    for i in range(768):
        mem[0x5800 + i] = (i * 11) & 0x7F
    return mem


def run(mem, routine, regs):
    sim = Simulator(mem, {})
    r = sim.registers
    r[IYh], r[IYl] = 0x5C, 0x3A
    for k, v in regs.items():
        r[k] = v
    r[SP] = 0xFF00
    mem[0xFF00], mem[0xFF01] = 0x00, 0x80   # return to $8000 = end
    r[PC] = routine
    while r[PC] != 0x8000:
        sim.run()
    return r


def case(c):
    name, kind, x, y, b, cc, d, e, pflag, attr, mask = c
    mem = pattern()
    mem[0x5C7D], mem[0x5C7E] = x, y
    mem[0x5C8F], mem[0x5C90], mem[0x5C91] = attr, mask, pflag
    if kind == 'plot':
        run(mem, 0x22E5, {B: b, C: cc})
    else:
        for _ in range(2 if kind == 'line2' else 1):
            mem[0x5C7D], mem[0x5C7E] = x, y
            run(mem, 0x24BA, {B: b, C: cc, D: d, E: e})
    screen = mem[0x4000:0x5B00]
    s = 0
    for i, v in enumerate(screen):
        s = (s * 31 + v + i) & 0xFFFFFFFF
    return s, mem[0x5C7D], mem[0x5C7E]


def main():
    for c in CASES:
        s, x, y = case(c)
        print("  ['%s', '%s', %d, %d, %d, %d, %d, %d, 0x%02X, 0x%02X, 0x%02X, %d, %d, %d]," %
              (c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10], s, x, y))
    # PIXEL-ADD over a grid
    s = 0
    mem = pattern()
    for y in range(0, 176, 7):
        for x in range(0, 256, 13):
            r = run(mem, 0x22AA, {B: y, C: x})
            s = (s * 31 + ((r[H] << 8) | r[L]) * 8 + r[A]) & 0xFFFFFFFF
    print('  // pixelAdd grid checksum %d' % s)


if __name__ == '__main__':
    main()
