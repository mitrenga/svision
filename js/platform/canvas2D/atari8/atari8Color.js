// begin code

/**
 * The colours of the Atari 8-bit computers as the PAL GTIA makes them. A
 * colour register holds **hue in the high nibble and luminance in the low
 * one** — 16 hues (0 is grey) by 16 luminances, of which the normal modes
 * use only the even ones, so 128 colours to pick from and 256 register
 * values. The chip has no RGB and no palette: it makes a composite signal,
 * and what a colour looks like is what the television decodes.
 *
 * The values here are therefore **computed, not measured**: the PAL GTIA's
 * hue angles come from the Altirra Hardware Reference Manual (table 14: hue
 * 1 at 135° in U-V space, then unequal steps of the delay line, an inverter
 * for hues 3-10, a wide gap between 6/7 and 10/11), decoded through the
 * standard PAL YUV-to-RGB matrix at a chosen delay, saturation and
 * luminance ramp. The manual notes that the ideal 22.5° delay gives a
 * sea-green Graphics 0 screen and real machines were adjusted nearer 18-19°
 * for the familiar blue; the default here is 18.5°. `setup()` regenerates
 * the palette with other parameters, and `setPalette()` replaces it with a
 * measured one when a game brings its own.
 *
 * Where colours come from on the machine (shadow registers of the OS in
 * brackets):
 *
 *   COLBK  $D01A (COLOR4 $02C8)   background and border
 *   COLPF0 $D016 (COLOR0 $02C4)   playfield 0
 *   COLPF1 $D017 (COLOR1 $02C5)   playfield 1 — in text mode 2 only its luminance
 *   COLPF2 $D018 (COLOR2 $02C6)   playfield 2 — the text background
 *   COLPF3 $D019 (COLOR3 $02C7)   playfield 3 / fifth player
 *   COLPM0-3 $D012-$D015          players and missiles
 */
export class Atari8Color {

  /** the delay-line taps of each hue, as multiples of the delay angle from
      135°; hue 15 shares the delays of hue 1, so it is the same colour at any
      adjustment, as the manual says */
  static get TAPS() { return [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 0]; }

  /** the OS defaults for Graphics 0: orange, light text, blue, pink, black */
  static get OS_COLOR0() { return 0x28; }
  static get OS_COLOR1() { return 0xCA; }
  static get OS_COLOR2() { return 0x94; }
  static get OS_COLOR3() { return 0x46; }
  static get OS_COLOR4() { return 0x00; }

  /**
   * Regenerates the 256 colours.
   * @param {Object} [options] - `delay` degrees per delay tap (18.5),
   *        `saturation` chroma amplitude in U-V (0.3), `gamma` of the
   *        luminance ramp (1), `black` the level of luminance 0 (0).
   */
  static setup(options) {
    var opts = Object.assign({delay: 18.5, saturation: 0.3, gamma: 1, black: 0}, options || {});
    Atari8Color.parameters = opts;
    Atari8Color.palette = new Array(256);
    for (var value = 0; value < 256; value++) {
      var hue = value >> 4;
      var lum = value & 15;
      var y = opts.black+(1-opts.black)*Math.pow(lum/15, opts.gamma);
      var u = 0, v = 0;
      if (hue > 0) {
        var angle = (135-Atari8Color.TAPS[hue-1]*opts.delay)*Math.PI/180;
        u = opts.saturation*Math.cos(angle);
        v = opts.saturation*Math.sin(angle);
      }
      var r = y+1.140*v;
      var g = y-0.395*u-0.581*v;
      var b = y+2.032*u;
      Atari8Color.palette[value] = '#'+Atari8Color.hex2(r)+Atari8Color.hex2(g)+Atari8Color.hex2(b);
    }
    Atari8Color.lookups = {};
  } // setup

  /**
   * Replaces the palette with a measured one.
   * @param {string[]} palette - 256 hex colours, indexed by register value.
   */
  static setPalette(palette) {
    Atari8Color.palette = palette.slice(0, 256);
    Atari8Color.lookups = {};
  } // setPalette

  /**
   * A component 0..1 as two hex digits, clamped.
   * @param {number} c - The component.
   * @returns {string} Two hex digits.
   */
  static hex2(c) {
    var n = Math.round(Math.max(0, Math.min(1, c))*255);
    return (n < 16 ? '0' : '')+n.toString(16);
  } // hex2

  /**
   * The colour of a register value.
   * @param {number} value - 0-255: hue in the high nibble, luminance in the low.
   * @returns {string} The hex colour.
   */
  static color(value) {
    return Atari8Color.palette[value & 0xFF];
  } // color

  /**
   * A register value from hue and luminance, the way BASIC's SETCOLOR takes them.
   * @param {number} hue - 0-15.
   * @param {number} luminance - 0-15 (odd values show as the even one below).
   * @returns {number} The register value.
   */
  static value(hue, luminance) {
    return ((hue & 15) << 4) | (luminance & 15);
  } // value

  /**
   * The 256 colours as packed pixels, in the byte order of this machine's
   * `Uint32Array`, made once per byte order and dropped when the palette changes.
   * @param {boolean} littleEndian - Whether to pack for a little-endian machine.
   * @returns {Uint32Array} 256 packed opaque pixels.
   */
  static lookup(littleEndian) {
    var key = littleEndian ? 'le' : 'be';
    if (!Atari8Color.lookups[key]) {
      var table = new Uint32Array(256);
      for (var i = 0; i < 256; i++) {
        var hex = Atari8Color.palette[i];
        var r = parseInt(hex.substring(1, 3), 16);
        var g = parseInt(hex.substring(3, 5), 16);
        var b = parseInt(hex.substring(5, 7), 16);
        table[i] = (littleEndian
          ? (255 << 24) | (b << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
      }
      Atari8Color.lookups[key] = table;
    }
    return Atari8Color.lookups[key];
  } // lookup

} // Atari8Color

Atari8Color.palette = null;
Atari8Color.parameters = null;
Atari8Color.lookups = {};
Atari8Color.setup();
