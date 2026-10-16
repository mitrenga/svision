// begin code

/**
 * The Atari math box — four AMD 2901 bit slices with a microcode ROM
 * (Battlezone, Red Baron, Tempest) — as the 6502 sees it: sixteen 16-bit
 * registers written byte by byte through `$1860 + offset`, a function
 * started by the write to some of the offsets, a 16-bit result read back
 * low and high. Integer semantics exactly as MAME's `mathbox.cpp` (the
 * reference for `battlezone/sources/docs/disasm_notes.md` 3.3): the
 * multiplies are 16 × 16 → 32 with the product shifted by 16 (so a 1.15
 * sine gives half the rotated value — the games compensate), the rounding
 * carry, the restoring divide of `N + 1` steps whose quotient is the top
 * bits of the 16-bit ratio, the octagonal distance `max + 3/8·min`.
 *
 * Everything is Int32 arithmetic with the registers held as int16 (the
 * `int16()` wrap after every operation, as the 16-bit ALU would); no
 * floats anywhere, so a frame is reproducible and matches a dump.
 *
 * `go(offset, data)` is the port write with the byte `data`; `result` is
 * the last result as int16. The named methods below are the sequences a
 * game runs — the same writes, spelled out — and are what a game calls.
 *
 * Registers (MAME R0–RF, Atari `MBUDOC`): 0 A, 1 B, 2 E, 3 F, 4 X, 5 Y,
 * 6 N, 7 X', 8 Y' hi, 9 Y' lo, A/B the 32-bit dividend, C–F scratch.
 */
export class MathBox {

  /**
   * Creates the box with all sixteen registers cleared: `r` are the
   * registers (MAME R0-RF) as int16, `result` the last result as int16.
   */
  constructor() {
    this.r = new Int16Array(16);
    this.result = 0;
  } // constructor

  /**
   * Wraps to a signed 16-bit value.
   * @param {number} v
   * @returns {number}
   */
  static int16(v) {
    return (v << 16) >> 16;
  } // int16

  /**
   * The port write: `offset` is the low byte of the address `$1860 + offset`,
   * `data` the byte written. Loads a register half or runs a function
   * (`$0B`, `$11`, `$12`, `$13`, `$14`, `$1D`, `$1E`, `$1C`).
   * @param {number} offset - 0..$1F
   * @param {number} data - 0..255
   */
  go(offset, data) {
    var r = this.r;
    var i16 = MathBox.int16;
    data &= 0xFF;
    switch (offset) {
      case 0x00: this.result = r[0] = i16((r[0] & 0xFF00) | data); break;
      case 0x01: this.result = r[0] = i16((r[0] & 0x00FF) | (data << 8)); break;
      case 0x02: this.result = r[1] = i16((r[1] & 0xFF00) | data); break;
      case 0x03: this.result = r[1] = i16((r[1] & 0x00FF) | (data << 8)); break;
      case 0x04: this.result = r[2] = i16((r[2] & 0xFF00) | data); break;
      case 0x05: this.result = r[2] = i16((r[2] & 0x00FF) | (data << 8)); break;
      case 0x06: this.result = r[3] = i16((r[3] & 0xFF00) | data); break;
      case 0x07: this.result = r[3] = i16((r[3] & 0x00FF) | (data << 8)); break;
      case 0x08: this.result = r[4] = i16((r[4] & 0xFF00) | data); break;
      case 0x09: this.result = r[4] = i16((r[4] & 0x00FF) | (data << 8)); break;
      case 0x0A: this.result = r[5] = i16((r[5] & 0xFF00) | data); break;
      case 0x0C: this.result = r[6] = data; break;
      case 0x15: this.result = r[7] = i16((r[7] & 0xFF00) | data); break;
      case 0x16: this.result = r[7] = i16((r[7] & 0x00FF) | (data << 8)); break;
      case 0x1A: this.result = r[8] = i16((r[8] & 0xFF00) | data); break;
      case 0x1B: this.result = r[8] = i16((r[8] & 0x00FF) | (data << 8)); break;
      case 0x0D: this.result = r[0xA] = i16((r[0xA] & 0xFF00) | data); break;
      case 0x0E: this.result = r[0xA] = i16((r[0xA] & 0x00FF) | (data << 8)); break;
      case 0x0F: this.result = r[0xB] = i16((r[0xB] & 0xFF00) | data); break;
      case 0x10: this.result = r[0xB] = i16((r[0xB] & 0x00FF) | (data << 8)); break;
      case 0x17: this.result = r[7]; break;
      case 0x19: this.result = r[8]; break;
      case 0x18: this.result = r[9]; break;

      case 0x0B:
        // YHSM: R5 hi := data; R4 -= R2; R5 -= R3; result = (R0*R4 - R1*R5) >> 16, nothing more
        r[5] = i16((r[5] & 0x00FF) | (data << 8));
        r[0xF] = -1;
        r[4] = i16(r[4]-r[2]);
        r[5] = i16(r[5]-r[3]);
        this.step048();
        break;

      case 0x11:
        // YHSP: like $0B without the subtraction, then R7 += R2, $12 with post-add, $13
        r[5] = i16((r[5] & 0x00FF) | (data << 8));
        r[0xF] = 0;
        this.step048();
        break;

      case 0x12:
        this.step012();
        break;

      case 0x13:
        this.divide(r[9], r[8]);
        break;

      case 0x14:
        this.divide(r[0xA], r[0xB]);
        break;

      case 0x1C:
        // window test — not used by Battlezone; kept as MAME has it
        r[5] = i16((r[5] & 0x00FF) | (data << 8));
        do {
          r[0xE] = i16((r[4]+r[7]) >> 1);
          r[0xF] = i16((r[5]+r[8]) >> 1);
          if (r[0xB] < r[0xE] && r[0xF] < r[0xE] && (r[0xE]+r[0xF]) >= 0) {
            r[7] = r[0xE];
            r[8] = r[0xF];
          } else {
            r[4] = r[0xE];
            r[5] = r[0xF];
          }
          r[6] = i16(r[6]-1);
        } while (r[6] >= 0);
        this.result = r[8];
        break;

      case 0x1D:
        // DSTNCE: R3 hi := data; R2 = |R2 - R0|; R3 = |R3 - R1|; then $1E
        r[3] = i16((r[3] & 0x00FF) | (data << 8));
        r[2] = i16(r[2]-r[0]);
        if (r[2] < 0) {
          r[2] = i16(-r[2]);
        }
        r[3] = i16(r[3]-r[1]);
        if (r[3] < 0) {
          r[3] = i16(-r[3]);
        }
        this.step01E();
        break;

      case 0x1E:
        this.step01E();
        break;
    }
  } // go

  /**
   * Microcode step $048 (functions $0B and $11): the first product pair.
   */
  step048() {
    var r = this.r;
    var i16 = MathBox.int16;
    var t = Math.imul(r[0], r[4]);
    r[0xC] = i16(t >> 16);
    r[0xE] = i16(t & 0xFFFF);
    t = Math.imul(-r[1], r[5]);                  // int32 negation, as MAME: -(-32768) stays 32768
    r[7] = i16(t >> 16);
    var q = i16(t & 0xFFFF);
    r[7] = i16(r[7]+r[0xC]);
    // rounding
    r[0xE] = i16((r[0xE] >> 1) & 0x7FFF);
    r[0xC] = i16((q >> 1) & 0x7FFF);
    q = i16(r[0xC]+r[0xE]);
    if (q < 0) {
      r[7] = i16(r[7]+1);
    }
    this.result = r[7];
    if (r[0xF] < 0) {
      return;
    }
    r[7] = i16(r[7]+r[2]);
    this.step012();
  } // step048

  /**
   * Function $12 (SYM): R8:R9 = R1*R4 + R0*R5; with the post-add of $11
   * (R8 += R3, R9 &= $FF00) and the divide $13 when it came from $11.
   */
  step012() {
    var r = this.r;
    var i16 = MathBox.int16;
    var t = Math.imul(r[1], r[4]);
    r[0xC] = i16(t >> 16);
    r[9] = i16(t & 0xFFFF);
    t = Math.imul(r[0], r[5]);
    r[8] = i16(t >> 16);
    var q = i16(t & 0xFFFF);
    r[8] = i16(r[8]+r[0xC]);
    r[9] = i16((r[9] >> 1) & 0x7FFF);
    r[0xC] = i16((q >> 1) & 0x7FFF);
    r[9] = i16(r[9]+r[0xC]);
    if (r[9] < 0) {
      r[8] = i16(r[8]+1);
    }
    r[9] = i16(r[9] << 1);
    this.result = r[8];
    if (r[0xF] < 0) {
      return;
    }
    r[8] = i16(r[8]+r[3]);
    r[9] = i16(r[9] & 0xFF00);
    this.divide(r[9], r[8]);
  } // step012

  /**
   * Microcode step $0BF: the restoring divide of the 32-bit `hi:lo` by
   * R7 in `N + 1` steps (R6 = N); the quotient's top bits, signed by
   * R7 and the dividend.
   * @param {number} lo - int16
   * @param {number} hi - int16
   */
  divide(lo, hi) {
    var r = this.r;
    var i16 = MathBox.int16;
    var c = lo, q = hi;
    r[0xE] = i16(r[7] ^ q);
    r[0xD] = q;
    if (q >= 0) {
      q = c;
    } else {
      r[0xD] = i16(-q-1);
      q = i16(-c-1);
      if (q < 0 && i16(q+1) < 0) {
        r[0xD] = i16(r[0xD]+1);
      }
      q = i16(q+1);
    }
    r[0xC] = r[7] >= 0 ? r[7] : i16(-r[7]);
    r[0xF] = r[6];
    do {
      r[0xD] = i16(r[0xD]-r[0xC]);
      var msb = (q & 0x8000) != 0 ? 1 : 0;
      q = i16(q << 1);
      if (r[0xD] >= 0) {
        q = i16(q+1);
      } else {
        r[0xD] = i16(r[0xD]+r[0xC]);
      }
      r[0xD] = i16(r[0xD] << 1);
      r[0xD] = i16(r[0xD]+msb);
      r[0xF] = i16(r[0xF]-1);
    } while (r[0xF] >= 0);
    this.result = r[0xE] >= 0 ? q : i16(-q);
  } // divide

  /**
   * Function $1E (DST2): result = max(R2, R3) + 3/8·min(R2, R3).
   */
  step01E() {
    var r = this.r;
    var i16 = MathBox.int16;
    if (r[3] >= r[2]) {
      r[0xC] = r[2];
      r[0xD] = r[3];
    } else {
      r[0xD] = r[2];
      r[0xC] = r[3];
    }
    r[0xC] = i16(r[0xC] >> 2);
    r[0xD] = i16(r[0xD]+r[0xC]);
    r[0xC] = i16(r[0xC] >> 1);
    this.result = r[0xD] = i16(r[0xC]+r[0xD]);
  } // step01E

  // ------------------------------------------------------ the game's sequences

  /**
   * Loads a 16-bit register through its two byte ports.
   * @param {number} lo - Offset of the low byte.
   * @param {number} hi - Offset of the high byte, or -1 for a function port (the caller writes it).
   * @param {number} value - int16
   */
  load(lo, hi, value) {
    this.go(lo, value & 0xFF);
    if (hi >= 0) {
      this.go(hi, (value >> 8) & 0xFF);
    }
  } // load

  /**
   * Sets the divide's step count: `N` iterations + 1 (register 6).
   * @param {number} n
   */
  setDivideSteps(n) {
    this.go(0x0C, n);
  } // setDivideSteps

  /**
   * The view transformation of one point (Battlezone `ROTATE`/`ROTPNT`,
   * notes 3.4 A): with R0 = cos, R1 = -sin, R2 = viewer Z, R3 = viewer X
   * already loaded (`setView`), function `$0B` on the point (Z, X) gives
   * the view Z halved, then `$12` the view X halved.
   * @param {number} z - int16 world Z of the point
   * @param {number} x - int16 world X of the point
   * @returns {{z: number, x: number}} The halved view coordinates (int16).
   */
  rotatePoint(z, x) {
    this.load(0x08, 0x09, z);
    this.go(0x0A, x & 0xFF);
    this.go(0x0B, (x >> 8) & 0xFF);
    var vz = this.result;
    this.go(0x12, 0);
    return {z: vz, x: this.result};
  } // rotatePoint

  /**
   * Loads the viewer for `rotatePoint`: R0 = cos, R1 = -sin (1.15), R2 = Z, R3 = X.
   * @param {number} cos
   * @param {number} minusSin
   * @param {number} z
   * @param {number} x
   */
  setView(cos, minusSin, z, x) {
    this.load(0x00, 0x01, cos);
    this.load(0x02, 0x03, minusSin);
    this.load(0x04, 0x05, z);
    this.load(0x06, 0x07, x);
  } // setView

  /**
   * Model transformation and projection of one vertex (Battlezone
   * `PNTPUT`, notes 3.4 B): R0 = -cos θ, R1 = sin θ, R2 = object view Z,
   * R3 = object view X loaded by `setModel`; `$11` on the vertex (Z, X)
   * leaves R7 = vertex view Z and the screen X as the result; then the
   * vertex Y through `$14` (RB:RA = Y << 16) gives the screen Y.
   * @param {number} z - int16 vertex Z as stored in the ROM (doubled)
   * @param {number} x - int16 vertex X (doubled)
   * @param {number} y - int16 vertex Y (with the height and the bounce applied by the caller)
   * @returns {{x: number, y: number, z: number}} screen X (negated as the 6502 does), screen Y, and the vertex's view Z (R7)
   */
  projectVertex(z, x, y) {
    this.load(0x08, 0x09, z);
    this.go(0x0A, x & 0xFF);
    this.go(0x11, (x >> 8) & 0xFF);
    var sx = MathBox.int16(-this.result);
    var vz = this.r[7];
    this.load(0x0D, 0x0E, 0);
    this.load(0x0F, 0x10, y);
    this.go(0x14, 0);
    return {x: sx, y: this.result, z: vz};
  } // projectVertex

  /**
   * Loads the object for `projectVertex`: R0 = -cos θ, R1 = sin θ, R2 = view Z, R3 = view X.
   * @param {number} minusCos
   * @param {number} sin
   * @param {number} z
   * @param {number} x
   */
  setModel(minusCos, sin, z, x) {
    this.load(0x00, 0x01, minusCos);
    this.load(0x02, 0x03, sin);
    this.load(0x04, 0x05, z);
    this.load(0x06, 0x07, x);
  } // setModel

  /**
   * The octagonal distance between two points (`DSTNCE`, `$1D`):
   * max(|dz|, |dx|) + 3/8·min.
   * @param {number} z0
   * @param {number} x0
   * @param {number} z1
   * @param {number} x1
   * @returns {number} int16
   */
  distance(z0, x0, z1, x1) {
    this.load(0x00, 0x01, z0);
    this.load(0x02, 0x03, x0);
    this.load(0x04, 0x05, z1);
    this.go(0x06, x1 & 0xFF);
    this.go(0x1D, (x1 >> 8) & 0xFF);
    return this.result;
  } // distance

  /**
   * The octagonal length of a vector already taken absolute (`DST2`, `$1E`).
   * @param {number} a - int16, non-negative
   * @param {number} b - int16, non-negative
   * @returns {number} int16
   */
  length(a, b) {
    this.load(0x04, 0x05, a);
    this.load(0x06, 0x07, b);
    this.go(0x1E, 0);
    return this.result;
  } // length

  /**
   * A bare divide (Battlezone `TRACK`): (hi:lo) / divisor with the current N.
   * @param {number} hi - int16 dividend high word (RB)
   * @param {number} lo - int16 dividend low word (RA)
   * @param {number} divisor - int16 (R7)
   * @returns {number} int16
   */
  ratio(hi, lo, divisor) {
    this.load(0x15, 0x16, divisor);
    this.load(0x0D, 0x0E, lo);
    this.load(0x0F, 0x10, hi);
    this.go(0x14, 0);
    return this.result;
  } // ratio

  /**
   * The radar blip (Battlezone `DRADAR`): R0 = sin φ, R1 = cos φ,
   * R2 = centreX, R3 = centreY, `$11` on (dist, 0) leaves
   * R7 = ((sin·dist) >> 16) + centreX and R8 = ((cos·dist) >> 16) + centreY
   * (Battlezone passes 0 and 316).
   * @param {number} sin - int16, 1.15 sine of the blip's bearing
   * @param {number} cos - int16, 1.15 cosine of the blip's bearing
   * @param {number} centreX - int16, the radar centre x (0 in Battlezone)
   * @param {number} centreY - int16, the radar centre y (316 in Battlezone)
   * @param {number} dist - int16
   * @returns {{x: number, y: number}}
   */
  radarBlip(sin, cos, centreX, centreY, dist) {
    this.load(0x00, 0x01, sin);
    this.load(0x02, 0x03, cos);
    this.load(0x04, 0x05, centreX);
    this.load(0x06, 0x07, centreY);
    this.load(0x08, 0x09, dist);
    this.go(0x0A, 0);
    this.go(0x11, 0);
    this.go(0x17, 0);
    var x = this.result;
    this.go(0x19, 0);
    return {x: x, y: this.result};
  } // radarBlip

} // MathBox
