const { AbstractFonts } = await import('../../../abstractFonts.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { Atari8Codes } = await import('./atari8Codes.js?ver='+window.srcVersion);
// begin code

/**
 * The character set of the Atari 8-bit computers as the XL/XE operating
 * system (rev. 2, the ROM of the 800XL) has it — the same glyphs as the
 * 400/800 OS, plus the international set — as a font: 128 glyphs of 8x8 in **internal code** order, eight
 * bytes a glyph, bit 7 the leftmost pixel — 1 KB at $E000, which ANTIC reads
 * when CHBASE points there ($E0, the OS default). Set 1 is the international
 * set at $CC00 of the XL, where the 32 graphics give way to accented letters.
 * Inverse video (codes 128-255) is not in the ROM: ANTIC inverts the glyph,
 * and so does {@link Atari8Fonts8x8#glyphBytes}.
 *
 * Two doors into it:
 *
 * - {@link Atari8Fonts8x8#setBytes} gives a whole set — what a model copies
 *   into the machine's memory for ANTIC to read, and what a game starts a
 *   character set of its own from;
 * - {@link AbstractFonts#getCharData} makes it a font of the library like
 *   {@link ZXFonts8x8}: a `TextEntity` prints with it anywhere.
 *
 * The ROM is Atari's; it is here for study of the machine (see SOURCES.md).
 */
export class Atari8Fonts8x8 extends AbstractFonts {

  /** glyphs in a set */
  static get SET_SIZE() { return 128; }
  /** bytes in a glyph */
  static get GLYPH_BYTES() { return 8; }
  /** glyphs in one row of `fontsData` */
  static get ROW_GLYPHS() { return 32; }
  /** where the OS keeps the sets */
  static get STANDARD_ADDRESS() { return 0xE000; }
  static get INTERNATIONAL_ADDRESS() { return 0xCC00; }

  /**
   * @param {Object} app - The application instance.
   * @param {boolean} [proportional] - Whether glyphs are trimmed to proportional widths.
   * @param {number} [set] - The set `getCharData()` prints in: 0 standard (the default), 1 international.
   */
  constructor(app, proportional, set) {
    super(app);
    this.id = 'Atari8Fonts8x8';

    this.proportional = !!proportional;
    /** the set text entities print in */
    this.set = set === 1 ? 1 : 0;
    this.charsHeight = 8;
    if (this.proportional) {
      this.charsSpacing = 2;
    }
    this.paragraphSpacing = 8;

    this.monospaceWidth = 8;
    this.spaces = {
      ' ': {width: 5, breaking: true, stretch: true}   // normal (breaking) space; games add hard/short via addSpace()
    };

    /** the ROM: 4 rows of 32 glyphs a set, 16 hex digits each; rows 0-3 set 0, 4-7 set 1 */
    this.fontsData = [
      '0000000000000000001818181800180000666666000000000066FF6666FF6600183E603C067C180000666C18306646001C361C386F663B000018181800000000000E1C18181C0E00007038181838700000663CFF3C6600000018187E1818000000000000001818300000007E00000000000000000018180000060C1830604000003C666E76663C000018381818187E00003C660C18307E00007E0C180C663C00000C1C3C6C7E0C00007E607C06663C00003C607C66663C00007E060C18303000003C663C66663C00003C663E060C380000001818001818000000181800181830060C1830180C060000007E00007E00006030180C18306000003C660C18001800',
      '003C666E6E603E0000183C66667E6600007C667C66667C00003C666060663C0000786C66666C7800007E607C60607E00007E607C60606000003E60606E663E000066667E66666600007E181818187E000006060606663C0000666C78786C66000060606060607E000063777F6B6363000066767E7E6E6600003C666666663C00007C66667C606000003C6666666C3600007C66667C6C6600003C603C06063C00007E1818181818000066666666667E0000666666663C18000063636B7F7763000066663C3C6666000066663C18181800007E0C1830607E00001E181818181E0000406030180C0600007818181818780000081C3663000000000000000000FF00',
      '00367F7F3E1C08001818181F1F1818180303030303030303181818F8F8000000181818F8F8181818000000F8F818181803070E1C3870E0C0C0E070381C0E07030103070F1F3F7FFF000000000F0F0F0F80C0E0F0F8FCFEFF0F0F0F0F00000000F0F0F0F000000000FFFF000000000000000000000000FFFF00000000F0F0F0F0001C1C7777081C000000001F1F181818000000FFFF000000181818FFFF18181800003C7E7E7E3C0000000000FFFFFFFFC0C0C0C0C0C0C0C0000000FFFF181818181818FFFF000000F0F0F0F0F0F0F0F01818181F1F000000786078607E181E0000183C7E18181800001818187E3C18000018307E3018000000180C7E0C180000',
      '00183C7E7E3C180000003C063E663E000060607C66667C0000003C6060603C000006063E66663E0000003C667E603C00000E183E1818180000003E66663E067C0060607C666666000018003818183C00000600060606063C0060606C786C66000038181818183C000000667F7F6B630000007C666666660000003C6666663C0000007C66667C606000003E66663E060600007C666060600000003E603C067C0000187E1818180E000000666666663E0000006666663C18000000636B7F3E36000000663C183C660000006666663E0C7800007E0C18307E0000183C7E7E183C001818181818181818007E787C6E660600081838783818080010181C1E1C181000',
      '0000000000000000001818181800180000666666000000000066FF6666FF6600183E603C067C180000666C18306646001C361C386F663B000018181800000000000E1C18181C0E00007038181838700000663CFF3C6600000018187E1818000000000000001818300000007E00000000000000000018180000060C1830604000003C666E76663C000018381818187E00003C660C18307E00007E0C180C663C00000C1C3C6C7E0C00007E607C06663C00003C607C66663C00007E060C18303000003C663C66663C00003C663E060C380000001818001818000000181800181830060C1830180C060000007E00007E00006030180C18306000003C660C18001800',
      '003C666E6E603E0000183C66667E6600007C667C66667C00003C666060663C0000786C66666C7800007E607C60607E00007E607C60606000003E60606E663E000066667E66666600007E181818187E000006060606663C0000666C78786C66000060606060607E000063777F6B6363000066767E7E6E6600003C666666663C00007C66667C606000003C6666666C3600007C66667C6C6600003C603C06063C00007E1818181818000066666666667E0000666666663C18000063636B7F7763000066663C3C6666000066663C18181800007E0C1830607E00001E181818181E0000406030180C0600007818181818780000081C3663000000000000000000FF00',
      '0C183C063E663E003018006666663E00366C0076767E6E000C187E607C607E0000003C60603C18303C66003C66663C003018003C66663C003018003818183C001C30307830307E000066003818183C000066006666663E0036003C063E663E0066003C6666663C000C18006666663E000C18003C66663C000066003C66663C006600666666667E003C661C063E663E003C66006666663E003C66003818183C000C183C667E603C0030183C667E603C00366C007C666666003CC33C667E603C0018003C063E663E0030183C063E663E001800183C667E6600786078607E181E0000183C7E18181800001818187E3C18000018307E3018000000180C7E0C180000',
      '180018181818180000003C063E663E000060607C66667C0000003C6060603C000006063E66663E0000003C667E603C00000E183E1818180000003E66663E067C0060607C666666000018003818183C00000600060606063C0060606C786C66000038181818183C000000667F7F6B630000007C666666660000003C6666663C0000007C66667C606000003E66663E060600007C666060600000003E603C067C0000187E1818180E000000666666663E0000006666663C18000000636B7F3E36000000663C183C660000006666663E0C7800007E0C18307E006666183C667E66001818181818181818007E787C6E660600081838783818080010181C1E1C181000'
    ];
    /** glyph rows by set and code, filled on the first request of each */
    this.glyphs = [new Array(256), new Array(256)];
  } // constructor

  /**
   * The hex digits of a glyph.
   * @param {number} code - The internal code, 0-127.
   * @param {number} set - 0 or 1.
   * @returns {string} 16 hex digits, top row first.
   */
  glyphHex(code, set) {
    var index = (set === 1 ? Atari8Fonts8x8.SET_SIZE : 0)+(code & 0x7F);
    var row = Math.floor(index/Atari8Fonts8x8.ROW_GLYPHS);
    var at = (index%Atari8Fonts8x8.ROW_GLYPHS)*Atari8Fonts8x8.GLYPH_BYTES*2;
    return this.fontsData[row].substring(at, at+Atari8Fonts8x8.GLYPH_BYTES*2);
  } // glyphHex

  /**
   * The eight bytes of a glyph, top row first, bit 7 the leftmost pixel —
   * what ANTIC reads for a screen byte, inverted for codes 128-255 as the
   * chip does it. Untrimmed whatever the `proportional` setting.
   * @param {number} code - The internal code, 0-255.
   * @param {number} [set] - 0 standard (the default), 1 international.
   * @returns {Uint8Array} 8 bytes.
   */
  glyphBytes(code, set) {
    var s = set === 1 ? 1 : 0;
    var c = code & 0xFF;
    if (!this.glyphs[s][c]) {
      var hex = this.glyphHex(c & 0x7F, s);
      var rows = new Uint8Array(Atari8Fonts8x8.GLYPH_BYTES);
      for (var y = 0; y < Atari8Fonts8x8.GLYPH_BYTES; y++) {
        rows[y] = parseInt(hex.substring(y*2, y*2+2), 16) ^ (c & 0x80 ? 0xFF : 0);
      }
      this.glyphs[s][c] = rows;
    }
    return this.glyphs[s][c];
  } // glyphBytes

  /**
   * A whole set as one block: the 1024 bytes ANTIC reads from CHBASE.
   * @param {number} [set] - 0 or 1.
   * @returns {Uint8Array} 1024 bytes, glyph 0 (the space) first.
   */
  setBytes(set) {
    var bytes = new Uint8Array(Atari8Fonts8x8.SET_SIZE*Atari8Fonts8x8.GLYPH_BYTES);
    for (var code = 0; code < Atari8Fonts8x8.SET_SIZE; code++) {
      bytes.set(this.glyphBytes(code, set), code*Atari8Fonts8x8.GLYPH_BYTES);
    }
    return bytes;
  } // setBytes

  /**
   * Decodes a character's glyph into scaled pixel rectangles for the text
   * entities, trimming blank columns when the font is proportional. Unknown
   * characters fall back to '?'.
   * @param {string} char - The character to render.
   * @param {string} bitMask - The bit value ('1' or '0') treated as a set pixel.
   * @param {number} scale - Pixel scale factor applied to coordinates and sizes.
   * @returns {Object} An object with a data array of [x, y, w, h] rects and the glyph width.
   */
  getCharData(char, bitMask, scale) {
    var spaceData = this.spaceCharData(char, bitMask, scale);
    if (spaceData !== null) {
      return spaceData;
    }

    var width = 8;
    var charObject = {data: []};
    var binData = [];
    var hex = this.glyphHex(Atari8Codes.encodeChar(char), this.set);
    for (var y = 0; y < 8; y++) {
      binData.push(Tool.hexToBin(hex.substring(y*2, y*2+2)));
    }

    if (this.proportional) {
      var doIt = true;
      while (doIt && width > 1) {
        for (var y = 0; y < 8; y++) {
          if (binData[y][0] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt) {
          for (var y = 0; y < 8; y++) {
            binData[y] = binData[y].substring(1);
          }
          width--;
        }
      }
      doIt = true;
      while (doIt && width > 1) {
        for (var y = 0; y < 8; y++) {
          if (binData[y][binData[y].length-1] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt) {
          for (var y = 0; y < 8; y++) {
            binData[y] = binData[y].substring(0, width-1);
          }
          width--;
        }
      }
    }

    binData.forEach((mask, y) => {
      for (var x = 0; x < mask.length; x++) {
        if (mask[x] == bitMask) {
          charObject.data.push([x*scale, y*scale, scale, scale]);
        }
      }
    });
    charObject.width = width*scale;

    return charObject;
  } // getCharData

  /**
   * Reports whether a character has a glyph of its own — one that does not
   * fall back to '?'.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is in ATASCII.
   */
  validChar(char) {
    if (char in this.spaces) {
      return true;
    }
    return char === '?' || Atari8Codes.encodeChar(char) !== Atari8Codes.encodeChar('?');
  } // validChar

} // Atari8Fonts8x8
