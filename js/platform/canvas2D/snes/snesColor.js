// begin code

/**
 * The colours of the Super Nintendo's PPU. There is no palette to measure:
 * CGRAM holds 256 words of **BGR555** — five bits each of blue, green and
 * red, `0bbbbbgggggrrrrr` — and the PPU puts them out digitally, scaled by
 * the **master brightness** of INIDISP (`$2100`, bits 0-3): 0 is black,
 * 15 is the colour as written.
 *
 * ★ The conversion here is the one MesenCE 2.2.1 draws with (the emulator
 * the first game on this platform is measured against, `Core/SNES/
 * SnesPpu.cpp` `ApplyBrightness`, `Shared/ColorUtilities.h`): each 5-bit
 * component is first scaled `c * brightness / 15` in integers, then widened
 * to 8 bits as `(c << 3) | (c >> 2)`, so that 31 is 255. A match tool
 * compares pixels of this conversion with the emulator's and the two have
 * to agree bit for bit. What the analogue output of a real console looked
 * like (gamma, the video encoder) is an open point of R-050, like the
 * pixel aspect — it would be a second conversion, not a change of this one.
 *
 * ```js
 * SNESColor.rgb(0x7FFF)            // '#ffffff'
 * SNESColor.rgb(0x001F, 7)         // red at brightness 7: 31*7/15 = 14 → '#730000'
 * SNESColor.value(31, 0, 0)        // 0x001F — red
 * var lut = SNESColor.lookup(true, 15);   // 32 768 packed pixels, little-endian
 * ```
 */
export class SNESColor {

  /** the brightness INIDISP holds at most */
  static get MAX_BRIGHTNESS() { return 15; }
  /** black and white as CGRAM words */
  static get BLACK() { return 0x0000; }
  static get WHITE() { return 0x7FFF; }

  /**
   * A CGRAM word from its three components.
   * @param {number} red - 0-31.
   * @param {number} green - 0-31.
   * @param {number} blue - 0-31.
   * @returns {number} The BGR555 word.
   */
  static value(red, green, blue) {
    return ((blue & 31) << 10) | ((green & 31) << 5) | (red & 31);
  } // value

  /**
   * One component scaled by the brightness and widened to 8 bits, the way
   * the emulator does it.
   * @param {number} c - The 5-bit component.
   * @param {number} brightness - 0-15.
   * @returns {number} 0-255.
   */
  static component(c, brightness) {
    var b = brightness === undefined ? 15 : (brightness & 15);
    var v = b === 15 ? (c & 31) : Math.floor((c & 31)*b/15);
    return (v << 3) | (v >> 2);
  } // component

  /**
   * The colour of a CGRAM word as a hex string.
   * @param {number} word - BGR555.
   * @param {number} [brightness] - INIDISP bits 0-3, 15 by default.
   * @returns {string} '#rrggbb'.
   */
  static rgb(word, brightness) {
    var r = SNESColor.component(word & 31, brightness);
    var g = SNESColor.component((word >> 5) & 31, brightness);
    var b = SNESColor.component((word >> 10) & 31, brightness);
    return '#'+SNESColor.hex2(r)+SNESColor.hex2(g)+SNESColor.hex2(b);
  } // rgb

  /**
   * Two hex digits of a byte.
   * @param {number} n - 0-255.
   * @returns {string} Two digits.
   */
  static hex2(n) {
    return (n < 16 ? '0' : '')+n.toString(16);
  } // hex2

  /**
   * A CGRAM word as one packed opaque pixel of a `Uint32Array` over an
   * `ImageData`, in the byte order of this machine.
   * @param {number} word - BGR555.
   * @param {number} brightness - 0-15.
   * @param {boolean} littleEndian - Byte order of the target.
   * @returns {number} The packed pixel.
   */
  static pack(word, brightness, littleEndian) {
    var r = SNESColor.component(word & 31, brightness);
    var g = SNESColor.component((word >> 5) & 31, brightness);
    var b = SNESColor.component((word >> 10) & 31, brightness);
    return (littleEndian
      ? (255 << 24) | (b << 16) | (g << 8) | r
      : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
  } // pack

  /**
   * All 32 768 colours at one brightness as packed pixels, made once per
   * brightness and byte order and kept — the table `paint32` converts a
   * line with. 128 KB a table; a game fading in and out touches all 16.
   * @param {boolean} littleEndian - Byte order of the target.
   * @param {number} [brightness] - 0-15, 15 by default.
   * @returns {Uint32Array} 32 768 packed opaque pixels, indexed by the CGRAM word.
   */
  static lookup(littleEndian, brightness) {
    var b = brightness === undefined ? 15 : (brightness & 15);
    var key = (littleEndian ? 'le' : 'be')+b;
    var table = SNESColor.lookups[key];
    if (!table) {
      table = new Uint32Array(32768);
      var comp = new Uint8Array(32);
      for (var c = 0; c < 32; c++) {
        comp[c] = SNESColor.component(c, b);
      }
      for (var word = 0; word < 32768; word++) {
        var r = comp[word & 31], g = comp[(word >> 5) & 31], bl = comp[(word >> 10) & 31];
        table[word] = (littleEndian
          ? (255 << 24) | (bl << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (bl << 8) | 255) >>> 0;
      }
      SNESColor.lookups[key] = table;
    }
    return table;
  } // lookup

} // SNESColor

/** the packed tables by byte order and brightness */
SNESColor.lookups = {};
