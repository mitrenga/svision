const { AVG } = await import('./avg.js?ver='+window.srcVersion);
// begin code

/**
 * The Atari Digital Vector Generator (DVG) as an interpreter of its display
 * list — the older vector generator (Lyle Rains, 1978) behind Asteroids,
 * Lunar Lander and Asteroids Deluxe, a sibling of {@link AVG}: a program of
 * 16-bit words in an 8 KiB space (DVG address 0 = the CPU's vector RAM,
 * Asteroids `$4000`; the vector ROM at DVG `$1000` = CPU `$5000`) that moves
 * the beam by relative vectors with a beam intensity, subroutines and a
 * global scale. Reference: `VECMAC.XX` (Atari, the assembler macros),
 * `avgdvg.cpp` `dvg_device` (MAME: `handler_2`, the rate multipliers and
 * the clipping) and `asteroids/sources/docs/disasm_notes.md` 2.1-2.4.
 *
 * Instructions (the top nibble of the first word is the opcode):
 *
 * | op | words | word(s) |
 * |---|---|---|
 * | VCTR (0-9) | 2 | `TTTT 0mYY YYYY YYYY`; `ZZZZ 0mXX XXXX XXXX` — T = the rate, m = the sign, a 10-bit magnitude, Z = the intensity |
 * | LABS (A) | 2 | `1010 00YY YYYY YYYY`; `SSSS 00XX XXXX XXXX` — beam to (X, Y), global scale S |
 * | HALT (B) | 1 | `B000` |
 * | JSRL (C) | 1 | `1100 aaaa aaaa aaaa` — a word address; stack of 4 |
 * | RTSL (D) | 1 | `D000` |
 * | JMPL (E) | 1 | `1110 aaaa aaaa aaaa` |
 * | SVEC (F) | 1 | `1111 SmYY ZZZZ smXX` — 2-bit magnitudes, (S, s) 00 x2, 10 x4, 01 x8, 11 x16 |
 *
 * A vector: the counters of both axes run for `2^(s+1)` steps, s = (S + T)
 * & 15 (nothing at all for s >= 10), and a 7497 rate multiplier per axis
 * turns steps into counts: `magnitude / 2^(9-s)` rounded half up
 * (`pulses`). T = 9 is 1:1, so the ROM's `VCTR 1023,0` at S = 0 moves
 * 1023; S = F (-1) halves, E quarters. An SVEC is a VCTR whose magnitude
 * is `m << 8` and T = 2 + S + 2s. The intensity is the Z nibble as it is
 * (0 = a move without a trace); a vector of zero length with Z > 0 is a
 * dot (WAIT with Z = 0 is nothing). A LABS with a scale nibble sets the
 * global scale for what follows.
 *
 * Units: the counters are 12-bit and the beam is on only while bit 10 of
 * both is clear — the visible area is 0..1023 x 0..1023, **y up**, the
 * origin at the lower left (VECMAC: "LOWER LEFT CORNER IS ADDRESS 0,0").
 * The interpreter keeps the positions as plain integers (no wrap at 4096:
 * a vector beyond the counters' range would wrap on the machine, the
 * game never draws one) and clips every drawn vector to that box
 * (MAME stops the trace as bit 10 goes high and resumes when it goes
 * low, which is the same line). Asteroids draws in 0..1023 x 128..895.
 *
 * The output is a list of segments `{x1, y1, x2, y2, intensity}` in DVG
 * units — the same form as the AVG's, so the display list helpers of the
 * vector platform and the `match*` tools serve both. Besides `run()` over
 * a memory there is `draw()` over a decoded instruction list (`decode()`),
 * which is how a game draws a shape the tools extracted from the ROM at
 * the scale and the place the program would (Asteroids copies the ship's
 * vectors into RAM with the sign bits flipped — a shape is data, not a
 * subroutine).
 */
export class DVG {

  /** the box the beam is visible in (notes 2.1: both counters' bit 10 clear) */
  static get VISIBLE() { return {left: 0, bottom: 0, right: 1023, top: 1023}; }

  /**
   * @param {Uint8Array|Function} [memory] - The 8 KiB DVG space (index 0 = DVG address 0), or `read(byteAddress)` returning a byte; none for `draw()` only.
   */
  constructor(memory) {
    this.read = typeof memory == 'function' ? memory : memory ? (a) => memory[a & 0x1FFF] : () => 0;
    this.reset();
  } // constructor

  /**
   * Beam at (0, 0), scale 0, intensity 0, empty stack and list.
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 0;
    this.intensity = 0;
    this.stack = [];
    this.segments = [];
    this.halted = false;
    this.steps = 0;
  } // reset

  /**
   * A 16-bit word at a DVG byte address (little endian).
   * @param {number} address
   * @returns {number}
   */
  word(address) {
    return this.read(address) | (this.read(address+1) << 8);
  } // word

  /**
   * A sign-magnitude field of a VCTR word: bit 10 the sign, bits 0-9 the magnitude.
   * @param {number} w
   * @returns {number} The signed magnitude.
   */
  static magnitude(w) {
    var m = w & 0x3FF;
    return w & 0x400 ? -m : m;
  } // magnitude

  /**
   * The counts a 7497 rate multiplier pair delivers for a magnitude over
   * the `2^(s+1)` steps of a vector at the total scale s (`avgdvg.cpp`
   * `handler_2`): the magnitude's top bits weighted `2^(s-9)` plus the
   * next bit below — `magnitude / 2^(9-s)` rounded half up; nothing for
   * s >= 10 (the step count overflows to 0).
   * @param {number} magnitude - 0..1023 (an SVEC's is `m << 8`).
   * @param {number} s - The total scale (S + T) & 15.
   * @returns {number}
   */
  static pulses(magnitude, s) {
    if (s >= 10) {
      return 0;
    }
    var shift = 9-s;
    var whole = magnitude >> shift;
    var half = shift > 0 ? (magnitude >> (shift-1)) & 1 : 0;
    return whole+half;
  } // pulses

  /**
   * Decodes the instruction at a word (and the next, for the two-word
   * ones) — the form `draw()` takes and the `rom2*` tools write.
   * @param {number} w - The first word.
   * @param {number} [w1] - The second word (VCTR, LABS).
   * @returns {Object} `{op, words}` plus `t, dx, dy, z` (VCTR, SVEC — dx, dy signed magnitudes), `x, y, scale` (LABS), `address` (JSRL, JMPL: a word address).
   */
  static decode(w, w1) {
    var op = w >> 12;
    if (op <= 9) {
      return {op: 'VCTR', words: 2, t: op, dx: DVG.magnitude(w1 || 0), dy: DVG.magnitude(w), z: (w1 || 0) >> 12};
    }
    switch (op) {
      case 0xA:
        return {op: 'LABS', words: 2, x: (w1 || 0) & 0xFFF, y: w & 0xFFF, scale: (w1 || 0) >> 12};
      case 0xB:
        return {op: 'HALT', words: 1};
      case 0xC:
        return {op: 'JSRL', words: 1, address: w & 0xFFF};
      case 0xD:
        return {op: 'RTSL', words: 1};
      case 0xE:
        return {op: 'JMPL', words: 1, address: w & 0xFFF};
      default: {
        // SVEC: 1111 S m YY ZZZZ s m XX — the rate from (S, s)
        var S = (w >> 11) & 1, s = (w >> 3) & 1;
        var dx = (w & 3) << 8, dy = ((w >> 8) & 3) << 8;
        return {op: 'SVEC', words: 1, t: 2+S+2*s, dx: w & 4 ? -dx : dx, dy: w & 0x400 ? -dy : dy, z: (w >> 4) & 0xF};
      }
    }
  } // decode

  /**
   * Runs the program at a DVG byte address until HALT, an RTSL with an
   * empty stack (a subroutine run on its own) or `maxSteps`.
   * @param {number} address - DVG byte address (CPU address minus the base, Asteroids `$4000`).
   * @param {number} [maxSteps] - Safety limit, default 100000 instructions.
   * @returns {DVG} this
   */
  run(address, maxSteps) {
    var pc = (address >> 1) & 0xFFF;
    var limit = maxSteps || 100000;
    this.halted = false;
    while (this.steps < limit) {
      this.steps++;
      var w = this.word(pc*2);
      var i = DVG.decode(w, w >> 12 <= 0xA ? this.word((pc+1)*2) : 0);
      switch (i.op) {
        case 'VCTR':
        case 'SVEC':
          this.vector(i.dx, i.dy, i.t, i.z);
          break;
        case 'LABS':
          this.labs(i.x, i.y, i.scale);
          break;
        case 'HALT':
          this.halted = true;
          return this;
        case 'JSRL':
          if (this.stack.length >= 4) {
            throw new Error('DVG: stack overflow at '+(pc*2).toString(16));
          }
          this.stack.push(pc+1);
          pc = i.address;
          continue;
        case 'RTSL':
          if (this.stack.length == 0) {
            return this;
          }
          pc = this.stack.pop();
          continue;
        case 'JMPL':
          pc = i.address;
          continue;
      }
      pc = (pc+i.words) & 0xFFF;
    }
    throw new Error('DVG: no HALT within '+limit+' steps');
  } // run

  /**
   * Runs a decoded instruction list (the `code` of a shape the tools
   * wrote): VCTR, SVEC and LABS as the program would, a RTSL or HALT
   * ends it, a JSRL or JMPL is not followed (the list is data).
   * @param {Array} code - `[{op, t, dx, dy, z} | {op: 'LABS', x, y, scale} | ...]`
   * @returns {DVG} this
   */
  draw(code) {
    for (var k = 0; k < code.length; k++) {
      var i = code[k];
      switch (i.op) {
        case 'VCTR':
        case 'SVEC':
          this.vector(i.dx, i.dy, i.t, i.z);
          break;
        case 'LABS':
          this.labs(i.x, i.y, i.scale);
          break;
        case 'RTSL':
        case 'HALT':
          return this;
      }
    }
    return this;
  } // draw

  /**
   * LABS: the beam to an absolute position, the global scale set.
   * @param {number} x
   * @param {number} y
   * @param {number} scale - 0..15 (0 = x1, 1 = x2 ... 7 = x128, F = x1/2, E = x1/4 ... 8 = x1/256).
   */
  labs(x, y, scale) {
    this.x = x & 0xFFF;
    this.y = y & 0xFFF;
    this.scale = scale & 0xF;
  } // labs

  /**
   * Moves the beam by a vector at the total scale (S + T) & 15 and keeps
   * the visible part of the trace when the intensity is not zero.
   * @param {number} dx - Signed magnitude (an SVEC's `m << 8`).
   * @param {number} dy
   * @param {number} t - The rate 0..9 of a VCTR, 2..5 of an SVEC.
   * @param {number} z - The intensity 0..15.
   */
  vector(dx, dy, t, z) {
    var s = (this.scale+t) & 0xF;
    var px = DVG.pulses(Math.abs(dx), s), py = DVG.pulses(Math.abs(dy), s);
    var x1 = this.x, y1 = this.y;
    this.x += dx < 0 ? -px : px;
    this.y += dy < 0 ? -py : py;
    this.intensity = z;
    if (z > 0) {
      var c = AVG.clip(x1, y1, this.x, this.y, DVG.VISIBLE);
      if (c) {
        c.intensity = z;
        this.segments.push(c);
      }
    }
  } // vector

  /**
   * Appends segments to a {@link VectorDisplayList} in desktop units: x
   * as it is, y flipped around `yTop` (Asteroids: 895, the top of the
   * picture, so 128..895 becomes 767..0). A dot becomes a short wide
   * line as in `AVG.appendTo`, which does the work.
   * @param {VectorDisplayList} list
   * @param {Array} segments
   * @param {number} yTop - The DVG y that lands on desktop y 0.
   * @param {Object} [style] - color, strokeWidth, dotWidth; `intensity` comes from the segment
   * @returns {VectorDisplayList} The list, for chaining
   */
  static appendTo(list, segments, yTop, style) {
    return AVG.appendTo(list, segments, 0, yTop, style);
  } // appendTo

  /**
   * Moves segments by (dx, dy).
   * @param {Array} segments - Segments `{x1, y1, x2, y2, intensity}`
   * @param {number} dx
   * @param {number} dy
   * @returns {Array} New segments; the input is left untouched.
   */
  static translate(segments, dx, dy) {
    return AVG.translate(segments, dx, dy);
  } // translate

} // DVG
