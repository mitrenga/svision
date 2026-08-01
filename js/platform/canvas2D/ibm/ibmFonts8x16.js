/**/
const { AbstractFonts } = await import('../../../abstractFonts.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { univgaFontData } = await import('./univgaFontData.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../../abstractFonts.js';
import Tool from '../../../tool.js';
import univgaFontData from './univgaFontData.js';
/**/
// begin code

/**
 * An 8x16 bitmap font based on the UniVGA character set (a Unicode-complete
 * VGA font) for the canvas 2D platform. Glyphs are looked up by Unicode code
 * point in `univgaFontData` (a Map of ~2900 code points), each value being 32
 * hex digits (16 rows x 1 byte per row); every byte is the 8-pixel row mask
 * for that line of the glyph. The font can render as a fixed 8-pixel-wide font
 * or, when `proportional` is set, trim the blank left/right columns to produce
 * variable-width glyphs.
 */
export class IBMFonts8x16 extends AbstractFonts {

  /**
   * Initializes the font metrics and the character/bitmap tables, choosing
   * between fixed-width and proportional rendering.
   * @param {Object} app - The owning application instance.
   * @param {boolean} proportional - When true, glyphs are trimmed of blank
   *   left/right columns to render with variable widths.
   */
  constructor(app, proportional) {
    super(app);
    this.id = 'IBMFonts8x16';

    this.proportional = proportional;
    this.charsHeight = 16;
    if (proportional) {
      this.charsSpacing = 1;
    }
    this.paragraphSpacing = 16;

    this.monospaceWidth = 8;
    // Shade blocks ('▒'/'░'/'█' ...) are real, printable glyphs in the UniVGA set,
    // so they are NOT spaces here. The core font defines only the normal space;
    // a game adds a hard space (e.g. no-break space) via addSpace() if it needs one.
    this.spaces = {
      ' ': {width: 5, breaking: true, stretch: true}   // normal (breaking) space
    };

    // glyphs keyed by Unicode code point (shared UniVGA Map).
    this.fontsMap = univgaFontData;
  } // constructor

  /**
   * Looks up the 32-hex glyph bitmap for a character by Unicode code point,
   * falling back to '?' when the character is not present in the font.
   * @param {string} char - The character to look up.
   * @returns {string} The glyph as 32 hex digits.
   */
  glyphHex(char) {
    var hex = this.fontsMap.get(char.codePointAt(0));
    if (hex === undefined) {
      hex = this.fontsMap.get(63);   // '?'
    }
    return hex;
  } // glyphHex

  /**
   * Returns the rendering data for a single character, scaled by `scale`.
   * Decodes the glyph's 16 hex-encoded rows into binary, optionally trims
   * blank columns for proportional rendering, and emits one scaled
   * `[x, y, width, height]` rectangle for every set pixel. Falls back to '?'
   * when the character is not present in the font.
   * @param {string} char - The character to render.
   * @param {string} bitMask - The bit value ('1' or '0') treated as a set pixel.
   * @param {number} scale - The scale factor applied to the output rectangles.
   * @returns {Object} An object with `width` and `data` (array of rectangles).
   */
  getCharData(char, bitMask, scale) {
    var spaceData = this.spaceCharData(char, bitMask, scale);
    if (spaceData !== null) {
      return spaceData;
    }

    var width = 8;
    var charObject = { data: [] };
    var binData = [];
    var hex = this.glyphHex(char);
    for (var y = 0; y < 16; y++) {
      binData.push(Tool.hexToBin(hex.substring(y*2, y*2+2)));
    }

    // convert for proportional font
    if (this.proportional == true) {

      // left cut
      var doIt = true;
      while (doIt == true) {
        for (var y = 0; y < 16; y++) {
          if (binData[y][0] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt == true) {
          for (var y = 0; y < 16; y++) {
            binData[y] = binData[y].substring(1);
          }
          width--;
        }
      }

      // right cut
      doIt = true;
      while (doIt == true) {
        for (var y = 0; y < 16; y++) {
          if (binData[y][binData[y].length - 1] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt == true) {
          for (var y = 0; y < 16; y++) {
            binData[y] = binData[y].substring(0, width - 1);
          }
          width--;
        }
      }
    }

    // convert binary to array
    binData.forEach((mask, y) => {
      for (var x = 0; x < mask.length; x++) {
        if (mask[x] == bitMask) {
          charObject.data.push([x * scale, y * scale, scale, scale]);
        }
      }
    });
    charObject.width = width * scale;

    return charObject;
  } // getCharData

  /**
   * Tests whether the given character has a glyph defined in this font.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is defined, otherwise false.
   */
  validChar(char) {
    if (char in this.spaces) {
      return true;
    }
    if (this.fontsMap.has(char.codePointAt(0))) {
      return true;
    }
    return false;
  } // validChar

} // IBMFonts8x16

export default IBMFonts8x16;
