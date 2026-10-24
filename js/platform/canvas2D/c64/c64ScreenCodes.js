// begin code

/**
 * The character codes of the C64 screen memory and how they map to Unicode.
 *
 * What sits in the screen RAM at $0400 is neither ASCII nor PETSCII but a
 * **screen code**: the index of the glyph in the character generator. `@` is
 * 0, `A`-`Z` are 1-26, the space is 32, the digits and punctuation keep their
 * ASCII values, and 64-127 are the graphics characters — the box pieces, the
 * card suits, the shaded blocks. Codes 128-255 are the same glyphs in
 * reverse video (the ROM stores them inverted), which is how the cursor and
 * the `RVS ON` mode work.
 *
 * The character generator holds two sets of 256 glyphs, chosen by the game
 * with bit 1 of $D018: set 0 is **uppercase and graphics** (what the machine
 * boots in), set 1 is **lowercase and uppercase** (Shift-Commodore), where
 * codes 1-26 are `a`-`z`, 65-90 are `A`-`Z` and a few graphics give way.
 *
 * `encodeChar()` turns a JavaScript character into a screen code for a given
 * set, the way typing it at the keyboard would: in set 0 there are no
 * lowercase letters, so `a` lands on the glyph of `A`. A character neither
 * set has becomes `?`. The graphics characters map to the Unicode box drawing
 * and legacy computing blocks, so a test can read a row back as a string and
 * a game can print a frame with `┌─┐`.
 *
 * Nothing here touches the DOM (R-001).
 */
export class C64ScreenCodes {

  /** the reverse video bit */
  static get REVERSE() { return 0x80; }

  /**
   * The Unicode code point a screen code shows in a set, reverse video
   * ignored.
   * @param {number} code - The screen code, 0-255.
   * @param {number} [set] - 0 uppercase/graphics (the default), 1 lowercase/uppercase.
   * @returns {number} The code point.
   */
  static codePoint(code, set) {
    var index = code & 0x7F;
    if (set === 1 && index in C64ScreenCodes.LOWER) {
      return C64ScreenCodes.LOWER[index];
    }
    return C64ScreenCodes.UPPER[index];
  } // codePoint

  /**
   * Decodes one screen code to its character.
   * @param {number} code - The screen code.
   * @param {number} [set] - The character set, 0 by default.
   * @returns {string} One character.
   */
  static decodeChar(code, set) {
    return String.fromCodePoint(C64ScreenCodes.codePoint(code, set));
  } // decodeChar

  /**
   * Encodes one character to a screen code; `?` for one the set lacks.
   * @param {string} ch - One character (a surrogate pair counts as one).
   * @param {number} [set] - The character set, 0 by default.
   * @returns {number} The screen code, 0-127.
   */
  static encodeChar(ch, set) {
    var map = C64ScreenCodes.reverse(set === 1 ? 1 : 0);
    var code = map[ch.codePointAt(0)];
    return code === undefined ? 0x3F : code;
  } // encodeChar

  /**
   * Encodes a string to screen codes.
   * @param {string} text - The text.
   * @param {number} [set] - The character set, 0 by default.
   * @returns {Uint8Array} One screen code per character.
   */
  static encode(text, set) {
    var chars = Array.from(text);
    var codes = new Uint8Array(chars.length);
    for (var i = 0; i < chars.length; i++) {
      codes[i] = C64ScreenCodes.encodeChar(chars[i], set);
    }
    return codes;
  } // encode

  /**
   * Unicode code point → screen code for a set, built once.
   * @param {number} set - 0 or 1.
   * @returns {Object} The map.
   */
  static reverse(set) {
    if (!C64ScreenCodes.reverseTables[set]) {
      var map = {};
      // the graphics first, so a letter wins when a code point appears twice
      for (var i = 127; i >= 0; i--) {
        map[C64ScreenCodes.codePoint(i, set)] = i;
      }
      if (set === 0) {
        // no lowercase glyphs in this set: typing `a` shows `A`
        for (var c = 0; c < 26; c++) {
          map[0x61+c] = 1+c;
        }
      }
      map[0x20] = 0x20;
      map[0xA0] = 0x60;   // the shifted space is a separate glyph
      map[0x2588] = 0xA0;   // the full block is the space in reverse video (the cursor of the machine)
      C64ScreenCodes.reverseTables[set] = map;
    }
    return C64ScreenCodes.reverseTables[set];
  } // reverse

} // C64ScreenCodes

C64ScreenCodes.reverseTables = [null, null];

/**
 * Screen codes 0-127 of the uppercase/graphics set → Unicode. The graphics
 * follow the usual PETSCII mapping onto box drawing, block elements and the
 * "Symbols for Legacy Computing" block (U+1FB00).
 */
C64ScreenCodes.UPPER = [
  0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
  0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x00A3, 0x005D, 0x2191, 0x2190,
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
  0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
  0x2500, 0x2660, 0x1FB72, 0x1FB78, 0x1FB77, 0x1FB76, 0x1FB7A, 0x1FB71, 0x1FB74, 0x256E, 0x2570, 0x256F, 0x1FB7C, 0x2572, 0x2571, 0x1FB7D,
  0x1FB7E, 0x25CF, 0x1FB7B, 0x2665, 0x1FB70, 0x256D, 0x2573, 0x25CB, 0x2663, 0x1FB75, 0x2666, 0x253C, 0x1FB8C, 0x2502, 0x03C0, 0x25E5,
  0x00A0, 0x258C, 0x2584, 0x2594, 0x2581, 0x258F, 0x2592, 0x2595, 0x1FB8F, 0x25E4, 0x1FB87, 0x251C, 0x2597, 0x2514, 0x2510, 0x2582,
  0x250C, 0x2534, 0x252C, 0x2524, 0x258E, 0x258D, 0x1FB88, 0x1FB82, 0x1FB83, 0x2583, 0x1FB7F, 0x2596, 0x259D, 0x2518, 0x2598, 0x259A
];

/**
 * Where the lowercase/uppercase set differs: 1-26 are the lowercase letters,
 * 65-90 the capitals, and four graphics are replaced.
 */
C64ScreenCodes.LOWER = {};
for (let c = 0; c < 26; c++) {
  C64ScreenCodes.LOWER[1+c] = 0x61+c;
  C64ScreenCodes.LOWER[65+c] = 0x41+c;
}
C64ScreenCodes.LOWER[91] = 0x253C;
C64ScreenCodes.LOWER[92] = 0x1FB8C;
C64ScreenCodes.LOWER[93] = 0x2502;
C64ScreenCodes.LOWER[94] = 0x1FB96;
C64ScreenCodes.LOWER[95] = 0x1FB98;
