// begin code

/**
 * The colour lookup table of a VGA card — the 256 registers of the DAC, each
 * holding 6 bits of red, green and blue (0-63). A pixel in mode 13h is a byte,
 * and the byte means nothing until it passes through this table; that is why
 * fades, flashes and colour cycling on a VGA game touch the palette and never
 * the pixels.
 *
 * This is the **model of the machine**, not of any game. Which colours a game
 * puts into the registers is the game's business; that there are 256 of them,
 * that they hold 6 bits each and how 6 bits become a colour on the screen is
 * the card's, and belongs here.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas, so the same code runs in the
 * browser and in an offline `match*` tool under Node (R-001). The RGBA values
 * a canvas wants are made by {@link VGAPalette#lookup}, which packs them in the
 * byte order {@link RasterEntity.rgbaValue} uses; the entity owning the canvas
 * is {@link VGAVideoRAMEntity}.
 *
 * ## Six bits to eight
 *
 * The DAC output is scaled `(v << 2) | (v >> 4)`, so 63 maps to 255 and 0 to 0
 * with the full range in between — the same scaling DOSBox uses, so a
 * screenshot taken there compares byte for byte with a frame painted here.
 *
 * ## Fades and colour cycling
 *
 * {@link VGAPalette#fadeStep} moves every component one step towards a target
 * palette and says when it has arrived; a game calls it once per frame the
 * way the original called it once per timer tick. {@link VGAPalette#rotate}
 * turns a range of registers round by one — the running water and torches of
 * the era. Every write bumps {@link VGAPalette#version}, which the entity
 * watches to know when the picture has to be painted again although not a
 * pixel changed.
 *
 * ```js
 * var palette = VGAPalette.defaultPalette();
 * palette.set(1, 63, 0, 0);
 * var black = new VGAPalette();
 * while (!palette.fadeStep(black, 1)) { ... one frame ... }
 * ```
 */
export class VGAPalette {

  /** the number of registers */
  static get COLORS() { return 256; }
  /** bytes of a raw palette dump: 256 x r, g, b */
  static get BYTES() { return 768; }
  /** the largest value a component holds */
  static get MAX() { return 63; }

  /**
   * @param {Uint8Array|number[]|VGAPalette} [source] - Initial content: 768
   *        6-bit components r, g, b per register, or another palette to copy.
   *        Anything shorter fills the first registers and the rest stays black.
   */
  constructor(source) {
    this.id = 'VGAPalette';

    /** the registers, 3 bytes each, 6 bits used of every byte */
    this.bytes = new Uint8Array(VGAPalette.BYTES);
    /** bumped by every write; a painter compares it with the one it painted */
    this.version = 0;
    /** the packed RGBA values of every register, rebuilt lazily */
    this.lookupTable = null;
    this.lookupVersion = -1;
    if (source) {
      this.load(source);
    }
  } // constructor

  // ----------------------------------------------------------------- content

  /**
   * Loads registers from raw 6-bit components, the way a game reads them off
   * its data file and writes them to port 3C9h.
   * @param {Uint8Array|number[]|VGAPalette} source - r, g, b per register.
   * @param {number} [first] - The first register to load, 0 by default.
   * @param {number} [count] - How many registers; as many as the source has by default.
   * @returns {VGAPalette} This, so calls can be chained.
   */
  load(source, first, count) {
    var bytes = source instanceof VGAPalette ? source.bytes : source;
    var from = first || 0;
    var registers = count === undefined ? Math.floor(bytes.length/3) : count;
    registers = Math.max(0, Math.min(VGAPalette.COLORS-from, registers));
    for (var i = 0; i < registers*3; i++) {
      this.bytes[from*3+i] = bytes[i] & 0x3F;
    }
    this.version++;
    return this;
  } // load

  /**
   * Loads registers from 8-bit components — a PNG palette or a hand-written
   * table — scaling them down to the 6 bits the DAC holds.
   * @param {Uint8Array|number[]} rgb - r, g, b per register, 0-255.
   * @param {number} [first] - The first register to load, 0 by default.
   * @returns {VGAPalette} This.
   */
  load8bit(rgb, first) {
    var from = first || 0;
    var registers = Math.max(0, Math.min(VGAPalette.COLORS-from, Math.floor(rgb.length/3)));
    for (var i = 0; i < registers*3; i++) {
      this.bytes[from*3+i] = rgb[i] >> 2;
    }
    this.version++;
    return this;
  } // load8bit

  /**
   * Sets one register.
   * @param {number} index - 0-255.
   * @param {number} r - Red, 0-63.
   * @param {number} g - Green, 0-63.
   * @param {number} b - Blue, 0-63.
   * @returns {VGAPalette} This.
   */
  set(index, r, g, b) {
    var at = (index & 0xFF)*3;
    this.bytes[at] = r & 0x3F;
    this.bytes[at+1] = g & 0x3F;
    this.bytes[at+2] = b & 0x3F;
    this.version++;
    return this;
  } // set

  /**
   * Reads one register.
   * @param {number} index - 0-255.
   * @returns {number[]} [r, g, b], 0-63 each.
   */
  get(index) {
    var at = (index & 0xFF)*3;
    return [this.bytes[at], this.bytes[at+1], this.bytes[at+2]];
  } // get

  /**
   * Blackens every register — the state after the card is programmed for a
   * new mode and before a game has loaded anything, and the end of a fade out.
   * @returns {VGAPalette} This.
   */
  clear() {
    this.bytes.fill(0);
    this.version++;
    return this;
  } // clear

  /**
   * An independent copy — what a game takes before a fade so it knows where
   * to fade back to.
   * @returns {VGAPalette} The copy.
   */
  copy() {
    return new VGAPalette(this.bytes);
  } // copy

  /**
   * Whether two palettes hold the same registers.
   * @param {VGAPalette} other - The palette to compare with.
   * @returns {boolean} True when every component is equal.
   */
  equals(other) {
    for (var i = 0; i < VGAPalette.BYTES; i++) {
      if (this.bytes[i] !== other.bytes[i]) {
        return false;
      }
    }
    return true;
  } // equals

  // ---------------------------------------------------------- fades, cycling

  /**
   * Moves every component towards the target by at most `step`, and reports
   * whether the palette has arrived. Called once per frame it fades the
   * screen the way the originals did, component by component in 6-bit steps,
   * so a fade from full to black takes 63 steps at step 1 — Prince of Persia
   * fades in something like 16 frames, its step being 4.
   * @param {VGAPalette} target - Where to go.
   * @param {number} [step] - The largest change of a component per call, 1 by default.
   * @returns {boolean} True when every component equals the target.
   */
  fadeStep(target, step) {
    var by = step === undefined ? 1 : step;
    var done = true;
    for (var i = 0; i < VGAPalette.BYTES; i++) {
      var value = this.bytes[i];
      var wanted = target.bytes[i];
      if (value < wanted) {
        value = Math.min(wanted, value+by);
      } else if (value > wanted) {
        value = Math.max(wanted, value-by);
      }
      if (value !== wanted) {
        done = false;
      }
      this.bytes[i] = value;
    }
    this.version++;
    return done;
  } // fadeStep

  /**
   * Sets every register to a mix of two palettes — for a fade a game wants
   * driven by time rather than by steps, or for a screen tinted towards a
   * colour. `t` = 0 gives `from`, `t` = 1 gives `to`.
   * @param {VGAPalette} from - The palette at t = 0.
   * @param {VGAPalette} to - The palette at t = 1.
   * @param {number} t - 0-1.
   * @returns {VGAPalette} This.
   */
  blend(from, to, t) {
    var k = Math.max(0, Math.min(1, t));
    for (var i = 0; i < VGAPalette.BYTES; i++) {
      this.bytes[i] = Math.round(from.bytes[i]+(to.bytes[i]-from.bytes[i])*k);
    }
    this.version++;
    return this;
  } // blend

  /**
   * Turns a range of registers round by one place — colour cycling. With
   * `forward` the colour of `first` moves to `first+1` and the colour of
   * `last` comes round to `first`; without it the other way.
   * @param {number} first - The first register of the range.
   * @param {number} last - The last register of the range, inclusive.
   * @param {boolean} [forward] - The direction, forward by default.
   * @returns {VGAPalette} This.
   */
  rotate(first, last, forward) {
    var lo = Math.max(0, Math.min(first, last));
    var hi = Math.min(VGAPalette.COLORS-1, Math.max(first, last));
    if (hi <= lo) {
      return this;
    }
    var bytes = this.bytes;
    var i;
    if (forward === undefined || forward) {
      var lastColor = [bytes[hi*3], bytes[hi*3+1], bytes[hi*3+2]];
      for (i = hi; i > lo; i--) {
        bytes[i*3] = bytes[(i-1)*3];
        bytes[i*3+1] = bytes[(i-1)*3+1];
        bytes[i*3+2] = bytes[(i-1)*3+2];
      }
      bytes[lo*3] = lastColor[0];
      bytes[lo*3+1] = lastColor[1];
      bytes[lo*3+2] = lastColor[2];
    } else {
      var firstColor = [bytes[lo*3], bytes[lo*3+1], bytes[lo*3+2]];
      for (i = lo; i < hi; i++) {
        bytes[i*3] = bytes[(i+1)*3];
        bytes[i*3+1] = bytes[(i+1)*3+1];
        bytes[i*3+2] = bytes[(i+1)*3+2];
      }
      bytes[hi*3] = firstColor[0];
      bytes[hi*3+1] = firstColor[1];
      bytes[hi*3+2] = firstColor[2];
    }
    this.version++;
    return this;
  } // rotate

  // ------------------------------------------------------------- to the screen

  /**
   * Scales one 6-bit component to 8 bits the way the DAC does.
   * @param {number} value - 0-63.
   * @returns {number} 0-255.
   */
  static to8bit(value) {
    var v = value & 0x3F;
    return (v << 2) | (v >> 4);
  } // to8bit

  /**
   * One register as an 8-bit CSS colour, for the places in the library that
   * want a string — a button, a text entity.
   * @param {number} index - 0-255.
   * @returns {string} '#rrggbb'.
   */
  cssColor(index) {
    var rgb = this.get(index);
    return '#'+rgb.map((v) => VGAPalette.to8bit(v).toString(16).padStart(2, '0')).join('');
  } // cssColor

  /**
   * The packed RGBA value of every register, in the byte order of this
   * machine's `Uint32Array` — the table {@link VGAVideoRAM#paint32} reads a
   * pixel through. Rebuilt only after a write, and shared by every caller.
   * @param {boolean} littleEndian - Whether to pack for a little-endian machine.
   * @returns {Uint32Array} 256 packed opaque pixels.
   */
  lookup(littleEndian) {
    if (this.lookupTable === null || this.lookupVersion !== this.version
        || this.lookupLittleEndian !== littleEndian) {
      var table = this.lookupTable || new Uint32Array(VGAPalette.COLORS);
      for (var i = 0; i < VGAPalette.COLORS; i++) {
        var r = VGAPalette.to8bit(this.bytes[i*3]);
        var g = VGAPalette.to8bit(this.bytes[i*3+1]);
        var b = VGAPalette.to8bit(this.bytes[i*3+2]);
        table[i] = (littleEndian
          ? (255 << 24) | (b << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
      }
      this.lookupTable = table;
      this.lookupVersion = this.version;
      this.lookupLittleEndian = littleEndian;
    }
    return this.lookupTable;
  } // lookup

  // -------------------------------------------------------- the card's defaults

  /**
   * The 16 colours of the EGA/CGA that the BIOS puts in registers 0-15 of
   * every 256-colour mode — and the text mode palette. 6-bit components.
   * @returns {number[][]} 16 arrays of [r, g, b].
   */
  static get EGA() {
    return [
      [0, 0, 0], [0, 0, 42], [0, 42, 0], [0, 42, 42],
      [42, 0, 0], [42, 0, 42], [42, 21, 0], [42, 42, 42],
      [21, 21, 21], [21, 21, 63], [21, 63, 21], [21, 63, 63],
      [63, 21, 21], [63, 21, 63], [63, 63, 21], [63, 63, 63]
    ];
  } // EGA

  /**
   * The palette the BIOS programs when it switches to mode 13h — what a game
   * sees before it loads its own: 16 EGA colours, 16 greys, then 216 colours
   * in three blocks of brightness (63, 28, 16), each block three rings of
   * saturation, each ring 24 hues running blue → magenta → red → yellow →
   * green → cyan → blue. The last 8 registers are black. The ramps are the
   * BIOS's, rounded the way it rounds (a half goes down), so register 34 is
   * (31, 0, 63) and not (32, 0, 63).
   * @returns {VGAPalette} A new palette holding the defaults.
   */
  static defaultPalette() {
    var palette = new VGAPalette();
    var bytes = palette.bytes;
    var index = 0;
    var put = function(rgb) {
      bytes[index*3] = rgb[0];
      bytes[index*3+1] = rgb[1];
      bytes[index*3+2] = rgb[2];
      index++;
    };
    VGAPalette.EGA.forEach(put);
    [0, 5, 8, 11, 14, 17, 20, 24, 28, 32, 36, 40, 45, 50, 56, 63].forEach((v) => put([v, v, v]));
    var blocks = [[63, [0, 31, 45]], [28, [0, 14, 20]], [16, [0, 8, 11]]];
    blocks.forEach((block) => {
      var top = block[0];
      block[1].forEach((base) => {
        var ramp = [];
        for (var k = 0; k <= 4; k++) {
          ramp.push(Math.ceil(base+k*(top-base)/4-0.5));
        }
        for (var hue = 0; hue < 24; hue++) {
          var sextant = hue >> 2;
          var i = hue & 3;
          switch (sextant) {
            case 0: put([ramp[i], base, top]); break;       // blue -> magenta
            case 1: put([top, base, ramp[4-i]]); break;     // magenta -> red
            case 2: put([top, ramp[i], base]); break;       // red -> yellow
            case 3: put([ramp[4-i], top, base]); break;     // yellow -> green
            case 4: put([base, top, ramp[i]]); break;       // green -> cyan
            case 5: put([base, ramp[4-i], top]); break;     // cyan -> blue
          }
        }
      });
    });
    palette.version++;
    return palette;
  } // defaultPalette

  /**
   * A greyscale ramp — handy for a test picture and for the greys of a
   * fade-to-white.
   * @returns {VGAPalette} A new palette, register i holding grey i/4.
   */
  static greyscale() {
    var palette = new VGAPalette();
    for (var i = 0; i < VGAPalette.COLORS; i++) {
      var v = i >> 2;
      palette.bytes[i*3] = v;
      palette.bytes[i*3+1] = v;
      palette.bytes[i*3+2] = v;
    }
    palette.version++;
    return palette;
  } // greyscale

} // VGAPalette
