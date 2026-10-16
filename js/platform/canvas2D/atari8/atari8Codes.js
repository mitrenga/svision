// begin code

/**
 * The three alphabets of an Atari 8-bit computer and how they map:
 *
 * - **ATASCII** is what the OS and BASIC speak: ASCII from 32 to 122 with
 *   Atari's own graphics in 0-31 and a few symbols in 96 and 123-127, and
 *   bit 7 for inverse video.
 * - **Internal code** is what sits in the screen memory and indexes the
 *   character set: the ROM keeps the glyphs in the order space, punctuation,
 *   digits, capitals (0-63), then the graphics (64-95), then lowercase and
 *   the rest (96-127). ANTIC adds inverse video for bit 7 itself; the ROM
 *   has 128 glyphs.
 * - **Unicode**, for the JavaScript side: the graphics go to box drawing and
 *   block elements, the four editor keys to arrows.
 *
 * `encodeChar()` goes from a JavaScript character to the internal code, the
 * way the OS's `PRINT` ends up in memory; `decodeChar()` the other way.
 * Nothing here touches the DOM (R-001).
 */
export class Atari8Codes {

  /** the inverse video bit */
  static get INVERSE() { return 0x80; }

  /**
   * ATASCII → internal code, inverse bit kept.
   * @param {number} atascii - 0-255.
   * @returns {number} The internal code.
   */
  static toInternal(atascii) {
    var a = atascii & 0x7F;
    var i = a < 32 ? a+64 : a < 96 ? a-32 : a;
    return i | (atascii & 0x80);
  } // toInternal

  /**
   * Internal code → ATASCII, inverse bit kept.
   * @param {number} internal - 0-255.
   * @returns {number} The ATASCII code.
   */
  static toAtascii(internal) {
    var i = internal & 0x7F;
    var a = i < 64 ? i+32 : i < 96 ? i-64 : i;
    return a | (internal & 0x80);
  } // toAtascii

  /**
   * The Unicode code point of an ATASCII code, inverse ignored.
   * @param {number} atascii - 0-255.
   * @returns {number} The code point.
   */
  static codePoint(atascii) {
    return Atari8Codes.ATASCII[atascii & 0x7F];
  } // codePoint

  /**
   * Decodes an internal code to its character.
   * @param {number} internal - The screen byte.
   * @returns {string} One character.
   */
  static decodeChar(internal) {
    return String.fromCodePoint(Atari8Codes.codePoint(Atari8Codes.toAtascii(internal)));
  } // decodeChar

  /**
   * Encodes one character to the internal code; `?` for one the set lacks.
   * @param {string} ch - One character.
   * @returns {number} The internal code, 0-127.
   */
  static encodeChar(ch) {
    var atascii = Atari8Codes.reverse()[ch.codePointAt(0)];
    return Atari8Codes.toInternal(atascii === undefined ? 0x3F : atascii);
  } // encodeChar

  /**
   * Encodes a string to internal codes.
   * @param {string} text - The text.
   * @returns {Uint8Array} One code per character.
   */
  static encode(text) {
    var chars = Array.from(text);
    var codes = new Uint8Array(chars.length);
    for (var i = 0; i < chars.length; i++) {
      codes[i] = Atari8Codes.encodeChar(chars[i]);
    }
    return codes;
  } // encode

  /**
   * Unicode code point → ATASCII, built once.
   * @returns {Object} The map.
   */
  static reverse() {
    if (!Atari8Codes.reverseTable) {
      var map = {};
      for (var i = 127; i >= 0; i--) {
        map[Atari8Codes.ATASCII[i]] = i;
      }
      Atari8Codes.reverseTable = map;
    }
    return Atari8Codes.reverseTable;
  } // reverse

} // Atari8Codes

Atari8Codes.reverseTable = null;

/** ATASCII 0-127 → Unicode */
Atari8Codes.ATASCII = [
  0x2665, 0x251C, 0x2595, 0x2518, 0x2524, 0x2510, 0x2571, 0x2572, 0x25E2, 0x2597, 0x25E3, 0x259D, 0x2598, 0x2594, 0x2581, 0x2596,
  0x2663, 0x250C, 0x2500, 0x253C, 0x25CF, 0x2584, 0x258E, 0x252C, 0x2534, 0x258C, 0x2514, 0x241B, 0x2191, 0x2193, 0x2190, 0x2192,
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
  0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
  0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
  0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
  0x2666, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
  0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x2660, 0x007C, 0x21B0, 0x25C0, 0x25B6
];
