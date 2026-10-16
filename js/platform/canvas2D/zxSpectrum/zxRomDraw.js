// classic script (importScripts): no import, no export — R-001, R-048
// begin code

/**
 * The ROM's own plotting and line drawing — PIXEL-ADD `$22AA`, PLOT-SUB
 * `$22E5`, PO-ATTR `$0BDB` and DRAW-LINE `$24BA` — instruction for
 * instruction, on the memory of a game.
 *
 * It belongs to the machine, not to a game: a ZX game that calls these ROM
 * routines (Thunderbirds draws the threads of its spiders with DRAW-LINE and
 * places a sprite with PIXEL-ADD) gets exactly what the ROM does — the same
 * pixels, the same attributes, the same order of plotting — and so does a
 * remake that calls this.
 *
 * The routines read and write the system variables of the machine, and so
 * does this: COORDS `$5C7D` (x, y), ATTR-T `$5C8F`, MASK-T `$5C90` and
 * P-FLAG `$5C91` (bits 0 OVER, 2 INVERSE, 4 INK 9, 6 PAPER 9 — read through
 * `IY+$57`, IY = $5C3A). They come through the `memory` the caller gives:
 * `{rd(address), wr(address, value)}` over the whole 64 K, the video memory
 * $4000-$5AFF included.
 *
 * ROM coordinates: x 0-255 to the right, y 0-175 **up** from the bottom of the
 * upper screen (row 0 of pixels on the screen is y 175). A point out of range
 * is the ROM's report B, "Integer out of range" — here an Error.
 *
 * **A classic script, not a module** (R-048, as C64Collision of R-043): a
 * game calls these routines from its logic, which runs in the worker, and a
 * classic worker takes no `import`. The worker loads it with importScripts(),
 * Node tools with tools/classicScript.cjs.
 *
 * Free of DOM dependencies (R-001).
 */

class ZXRomDraw {

  /**
   * @param {{rd: function(number): number, wr: function(number, number)}} memory
   */
  constructor(memory) {
    this.memory = memory;
  } // constructor

  /**
   * PIXEL-ADD `$22AA`: the address of the byte holding pixel (x C, y B).
   * @param {number} b - y, 0-175.
   * @param {number} c - x, 0-255.
   * @returns {{address: number, bit: number}} The address, and A = x AND 7.
   */
  pixelAdd(b, c) {
    var a = (0xAF-b) & 0xFF;
    if (b > 0xAF) {
      throw new Error('ZXRomDraw: report B (y '+b+' off the screen)');
    }
    b = a;
    // AND A / RRA / SCF / RRA / AND A / RRA / XOR B / AND $F8 / XOR B
    a = b >> 1;
    a = (a >> 1) | 0x80;
    a = a >> 1;
    a = ((a ^ b) & 0xF8) ^ b;
    var h = a & 0xFF;
    // LD A,C / RLCA ×3 / XOR B / AND $C7 / XOR B / RLCA ×2
    a = c & 0xFF;
    a = ((a << 3) | (a >> 5)) & 0xFF;
    a = ((a ^ b) & 0xC7) ^ b;
    a = ((a << 2) | (a >> 6)) & 0xFF;
    return {address: (h << 8) | a, bit: c & 7};
  } // pixelAdd

  /**
   * PO-ATTR `$0BDB`: the attribute of the cell holding the byte at `address`
   * — ATTR-T under MASK-T, then PAPER 9 / INK 9 out of P-FLAG.
   * @param {number} address - A bitmap address.
   */
  poAttr(address) {
    var m = this.memory;
    var h = (((address >> 8) >> 3) & 3) | 0x58;
    var at = (h << 8) | (address & 0xFF);
    var e = m.rd(ZXRomDraw.ATTR_T), d = m.rd(ZXRomDraw.MASK_T);
    var a = ((m.rd(at) ^ e) & d) ^ e;
    var flags = m.rd(ZXRomDraw.P_FLAG);
    if (flags & 0x40) {
      a &= 0xC7;
      if (!(a & 0x04)) {
        a ^= 0x38;
      }
    }
    if (flags & 0x10) {
      a &= 0xF8;
      if (!(a & 0x20)) {
        a ^= 0x07;
      }
    }
    m.wr(at, a);
  } // poAttr

  /**
   * PLOT-SUB `$22E5`: plots (x C, y B) with OVER and INVERSE out of P-FLAG,
   * leaves the point in COORDS and sets its attribute.
   * @param {number} b - y.
   * @param {number} c - x.
   */
  plotSub(b, c) {
    var m = this.memory;
    m.wr(ZXRomDraw.COORDS, c & 0xFF);
    m.wr(ZXRomDraw.COORDS+1, b & 0xFF);
    var pixel = this.pixelAdd(b, c);
    // LD B,A / INC B / LD A,$FE / RRCA ×B → a 0 at the pixel, 1s elsewhere
    var mask = 0xFE;
    for (var n = pixel.bit+1; n > 0; n--) {
      mask = ((mask >> 1) | ((mask & 1) << 7)) & 0xFF;
    }
    var a = m.rd(pixel.address);
    var flags = m.rd(ZXRomDraw.P_FLAG);
    if (!(flags & 0x01)) {
      a &= mask;
    }
    if (!(flags & 0x04)) {
      a = (~(a ^ mask)) & 0xFF;
    }
    m.wr(pixel.address, a);
    this.poAttr(pixel.address);
  } // plotSub

  /**
   * DRAW-LINE `$24BA`: from COORDS, |dy| B and |dx| C, signs D (y) and E (x)
   * as 1 or $FF, every point through PLOT-SUB — the ROM's own stepping.
   * @param {number} b - |dy|.
   * @param {number} c - |dx|.
   * @param {number} d - Sign of dy, 1 or $FF.
   * @param {number} e - Sign of dx, 1 or $FF.
   */
  drawLine(b, c, d, e) {
    var m = this.memory;
    var l, h, straightD, straightE;
    if (c < b) {
      l = c;
      straightD = d;
      straightE = 0;
    } else {
      if ((c | b) === 0) {
        return;
      }
      l = b;
      b = c;
      straightD = 0;
      straightE = e;
    }
    h = b;
    var a = b >> 1;
    var count = b;
    while (count > 0) {
      a += l;
      var stepY, stepX;
      if (a > 0xFF || (a & 0xFF) >= h) {
        // D-L-DIAG
        a = ((a & 0xFF)-h) & 0xFF;
        stepY = d;
        stepX = e;
      } else {
        // D-L-HR-VT
        stepY = straightD;
        stepX = straightE;
      }
      var accumulator = a & 0xFF;
      var x = m.rd(ZXRomDraw.COORDS), y = m.rd(ZXRomDraw.COORDS+1);
      var ny = (stepY+y) & 0xFF;
      // LD A,C / INC A (no carry: $FF + 1 is 0) / ADD A,L
      var t = ((stepX+1) & 0xFF)+x;
      if (t > 0xFF) {
        if ((t & 0xFF) !== 0) {
          throw new Error('ZXRomDraw: report B (line off the screen)');
        }
      } else if (t === 0) {
        throw new Error('ZXRomDraw: report B (line off the screen)');
      }
      var nx = ((t & 0xFF)-1) & 0xFF;
      this.plotSub(ny, nx);
      a = accumulator;
      count--;
    }
  } // drawLine

} // ZXRomDraw

// the system variables, on the class: a classic script shares the worker's
// global scope with the game's own, so it declares nothing at the top level
// but the class itself
ZXRomDraw.COORDS = 0x5C7D;
ZXRomDraw.ATTR_T = 0x5C8F;
ZXRomDraw.MASK_T = 0x5C90;
ZXRomDraw.P_FLAG = 0x5C91;

if (typeof self !== 'undefined') { self.ZXRomDraw = ZXRomDraw; }
if (typeof module !== 'undefined' && module.exports) { module.exports = ZXRomDraw; }
