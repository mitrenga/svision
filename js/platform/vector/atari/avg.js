// begin code

/**
 * The Atari Analog Vector Generator (AVG) as an interpreter of its display
 * list — the model of the machine behind Battlezone, Tempest, Red Baron
 * and the others: a program of 16-bit words in the vector memory
 * (8 KiB, AVG address 0 = the CPU's vector RAM, Battlezone `$2000`) that
 * moves the beam by relative vectors with a beam intensity, subroutines
 * and a scale. Reference: `VGMC.MAC` (Atari), `avgdvg.cpp` (MAME) and
 * `battlezone/sources/docs/disasm_notes.md` 2.1-2.4.
 *
 * Instructions (top three bits of the first word):
 *
 * | op | words | word(s) |
 * |---|---|---|
 * | VCTR | 2 | `DY & $1FFF`; `ZZZ<<13 | DX & $1FFF` (13-bit two's complement) |
 * | HALT | 1 | `$2000` |
 * | SVEC | 1 | `$4000 | ZZZ<<5 | (DX/2 & $1F) | (DY/2 & $1F)<<8` (5-bit halves) |
 * | STAT | 1 | `$6000 | E<<10 | H<<9 | I<<8 | Z<<4` — intensity Z, clip window corner |
 * | SCAL | 1 | `$7000 | B<<8 | L` — binary scale B (0-7), linear L (0 = full, $80 = half) |
 * | CNTR | 1 | `$8040` — beam to the centre |
 * | JSRL | 1 | `$A000 | (addr & $1FFF)/2` (stack of 4) |
 * | RTSL | 1 | `$C000` |
 * | JMPL | 1 | `$E000 | (addr & $1FFF)/2` |
 *
 * Intensity of a vector: ZZZ = 1 takes the intensity of the last STAT,
 * any other ZZZ is 2·ZZZ; 0 moves the beam without drawing.
 *
 * Units: the position is kept in **screen units at binary scale 1**, the
 * scale the game sets at the start of every frame (`SCAL B=1`, "1/2 SIZE"
 * in VGMC); the self-test draws its 1024x768 frame with ±512/±384 at that
 * scale, so x runs -512..+511 and y -384..+383 around CNTR, **y up**. A
 * vector moves `d · 2^(1-B) · (256-L)/256`.
 *
 * Clipping: Battlezone's window circuit (Margolin). A STAT with E = 0
 * latches a corner of the window at the beam: H = 1 the upper right,
 * H = 0 the lower left; E = 1 leaves the window alone. Vectors are clipped
 * to the window (Liang-Barsky); the window starts open.
 *
 * The output is a list of segments `{x1, y1, x2, y2, intensity}` in those
 * units (a zero-length vector with intensity is a dot), plus a log of the
 * window changes — enough for a display list of the game and for a
 * `match*` tool that runs a dump of the vector RAM through the same code.
 */
export class AVG {

  /**
   * @param {Uint8Array|Function} memory - The 8 KiB AVG space (index 0 = AVG address 0), or `read(byteAddress)` returning a byte.
   */
  constructor(memory) {
    this.read = typeof memory == 'function' ? memory : (a) => memory[a & 0x1FFF];
    this.reset();
  } // constructor

  /**
   * Beam to the centre, intensity register cleared (0), scale B = 1,
   * window open; the segment list, the window log and the step count start
   * empty.
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.intensity = 0;
    this.scaleB = 1;
    this.scaleL = 0;
    this.window = {left: -Infinity, bottom: -Infinity, right: Infinity, top: Infinity};
    this.stack = [];
    this.segments = [];
    this.windows = [];
    this.halted = false;
    this.steps = 0;
  } // reset

  /**
   * A 16-bit word at an AVG byte address (little endian).
   * @param {number} address
   * @returns {number}
   */
  word(address) {
    return this.read(address) | (this.read(address+1) << 8);
  } // word

  /**
   * A 13-bit two's complement value.
   * @param {number} v - The word whose low 13 bits hold the value.
   * @returns {number} -4096..4095
   */
  static signed13(v) {
    v &= 0x1FFF;
    return v & 0x1000 ? v-0x2000 : v;
  } // signed13

  /**
   * A 5-bit two's complement value.
   * @param {number} v - The word whose low 5 bits hold the value.
   * @returns {number} -16..15
   */
  static signed5(v) {
    v &= 0x1F;
    return v & 0x10 ? v-0x20 : v;
  } // signed5

  /**
   * Runs the program at an AVG address until HALT, an RTSL with an empty
   * stack (a subroutine called on its own) or `maxSteps`.
   * @param {number} address - AVG byte address (CPU address minus the base, Battlezone `$2000`).
   * @param {number} [maxSteps] - Safety limit, default 100000 instructions.
   * @returns {AVG} this
   * @throws {Error} On a JSRL stack overflow, or when no HALT is reached within `maxSteps`.
   */
  run(address, maxSteps) {
    var pc = address & 0x1FFE;
    var limit = maxSteps || 100000;
    this.halted = false;
    while (this.steps < limit) {
      this.steps++;
      var w = this.word(pc);
      var op = w >> 13;
      switch (op) {
        case 0: {               // VCTR
          var w1 = this.word(pc+2);
          var dy = AVG.signed13(w);
          var dx = AVG.signed13(w1);
          this.vector(dx, dy, this.beamIntensity(w1 >> 13));
          pc += 4;
          break;
        }
        case 1:                 // HALT
          this.halted = true;
          return this;
        case 2: {               // SVEC
          var sdx = AVG.signed5(w)*2;
          var sdy = AVG.signed5(w >> 8)*2;
          this.vector(sdx, sdy, this.beamIntensity((w >> 5) & 7));
          pc += 2;
          break;
        }
        case 3:
          if (w & 0x1000) {     // SCAL
            this.scaleB = (w >> 8) & 7;
            this.scaleL = w & 0xFF;
          } else {              // STAT
            this.intensity = (w >> 4) & 0xF;
            if (!(w & 0x400)) {
              if (w & 0x200) {
                this.window.right = this.x;
                this.window.top = this.y;
              } else {
                this.window.left = this.x;
                this.window.bottom = this.y;
              }
              this.windows.push({at: this.segments.length, left: this.window.left, bottom: this.window.bottom, right: this.window.right, top: this.window.top});
            }
          }
          pc += 2;
          break;
        case 4:                 // CNTR
          this.x = 0;
          this.y = 0;
          pc += 2;
          break;
        case 5:                 // JSRL
          if (this.stack.length >= 4) {
            throw new Error('AVG: stack overflow at '+pc.toString(16));
          }
          this.stack.push(pc+2);
          pc = (w & 0x1FFF)*2;
          break;
        case 6:                 // RTSL
          if (this.stack.length == 0) {
            return this;
          }
          pc = this.stack.pop();
          break;
        case 7:                 // JMPL
          pc = (w & 0x1FFF)*2;
          break;
      }
    }
    throw new Error('AVG: no HALT within '+limit+' steps');
  } // run

  /**
   * The intensity a vector is drawn with, from its ZZZ bits.
   * @param {number} zzz
   * @returns {number} 0-15
   */
  beamIntensity(zzz) {
    return zzz == 1 ? this.intensity : zzz*2;
  } // beamIntensity

  /**
   * Moves the beam by a vector at the current scale; draws when the
   * intensity is not zero, clipped to the window.
   */
  vector(dx, dy, intensity) {
    var f = Math.pow(2, 1-this.scaleB)*(256-this.scaleL)/256;
    var x1 = this.x, y1 = this.y;
    this.x += dx*f;
    this.y += dy*f;
    if (intensity > 0) {
      var s = AVG.clip(x1, y1, this.x, this.y, this.window);
      if (s) {
        s.intensity = intensity;
        this.segments.push(s);
      }
    }
  } // vector

  /**
   * Liang-Barsky clipping of a segment to a window (y up: bottom < top).
   * @param {number} x1 - Start x
   * @param {number} y1 - Start y
   * @param {number} x2 - End x
   * @param {number} y2 - End y
   * @param {{left: number, bottom: number, right: number, top: number}} w - The window
   * @returns {{x1: number, y1: number, x2: number, y2: number}|false} The clipped segment, or false when it lies entirely outside.
   */
  static clip(x1, y1, x2, y2, w) {
    var t0 = 0, t1 = 1;
    var dx = x2-x1, dy = y2-y1;
    var p = [-dx, dx, -dy, dy];
    var q = [x1-w.left, w.right-x1, y1-w.bottom, w.top-y1];
    for (var i = 0; i < 4; i++) {
      if (p[i] == 0) {
        if (q[i] < 0) return false;
      } else {
        var t = q[i]/p[i];
        if (p[i] < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }
    return {x1: x1+dx*t0, y1: y1+dy*t0, x2: x1+dx*t1, y2: y1+dy*t1};
  } // clip

  /**
   * Appends segments to a {@link VectorDisplayList} in desktop units: the
   * AVG centre at (cx, cy), y flipped. A dot (a zero-length segment: the
   * radar blip, the shot explosion, the volcano's rocks) becomes a short
   * line with round caps and a wider stroke — on the XY monitor the beam
   * dwells at a point and burns a visible spot, a hairline's width would
   * be a pixel or two on the screen.
   * @param {VectorDisplayList} list
   * @param {Array} segments
   * @param {number} cx
   * @param {number} cy
   * @param {Object} [style] - color, strokeWidth, dotWidth (the diameter of a dot; 2.5 x strokeWidth
   *   unless given); `intensity` comes from the segment
   * @returns {VectorDisplayList} The list, for chaining
   */
  static appendTo(list, segments, cx, cy, style) {
    var n = (v) => Math.round(v*1000)/1000;
    var lineStyle = Object.assign({}, style || {});
    var dotWidth = lineStyle.dotWidth === undefined ? (lineStyle.strokeWidth || 1)*2.5 : lineStyle.dotWidth;
    delete lineStyle.dotWidth;
    var dotStyle = Object.assign({}, lineStyle, {strokeWidth: dotWidth});
    segments.forEach((s) => {
      var x1 = cx+s.x1, y1 = cy-s.y1, x2 = cx+s.x2, y2 = cy-s.y2;
      var dot = x1 == x2 && y1 == y2;
      if (dot) {
        x2 += 0.01;
      }
      list.line(n(x1), n(y1), n(x2), n(y2), Object.assign({intensity: s.intensity}, dot ? dotStyle : lineStyle));
    });
    return list;
  } // appendTo

  /**
   * Moves segments by (dx, dy) — for placing a shape extracted at the
   * origin.
   * @param {Array} segments - Segments `{x1, y1, x2, y2, intensity}`
   * @param {number} dx
   * @param {number} dy
   * @returns {Array} New segments; the input is left untouched.
   */
  static translate(segments, dx, dy) {
    return segments.map((s) => Object.assign({}, s, {x1: s.x1+dx, y1: s.y1+dy, x2: s.x2+dx, y2: s.y2+dy}));
  } // translate

} // AVG
