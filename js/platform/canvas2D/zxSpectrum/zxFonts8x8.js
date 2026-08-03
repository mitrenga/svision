/**/
const { AbstractFonts } = await import('../../../abstractFonts.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../../abstractFonts.js';
import Tool from '../../../tool.js';
/**/
// begin code

/**
 * ZX Spectrum 8x8 bitmap font. Holds the glyph bitmap table as a hex string where
 * each character is 16 hex digits (8 rows of one byte, each byte a row of 8 pixels),
 * indexed by the position of the character in fontsChars. Supports an optional
 * proportional mode that trims blank columns from each glyph, and provides per-glyph
 * pixel-rectangle data for rendering.
 */
export class ZXFonts8x8 extends AbstractFonts {

  /**
   * Initialises the font, its glyph data table, the supported character set and the
   * extra (non-ASCII) glyph set, optionally configuring proportional spacing.
   * @param {Object} app - The application instance.
   * @param {boolean} proportional - Whether glyphs are trimmed to proportional widths.
   */
  constructor(app, proportional) {
    super(app);
    this.id = 'ZXFonts8x8';

    this.proportional = proportional;
    this.charsHeight = 8; 
    if (proportional) {
      this.charsSpacing = 2;
    }
    this.paragraphSpacing = 8;

    this.monospaceWidth = 8;
    this.spaces = {
      ' ': {width: 5, breaking: true, stretch: true}   // normal (breaking) space; games add hard/short via addSpace()
    };

    this.fontsChars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_£abcdefghijklmnopqrstuvwxyz{|}~©';
    // Default glyph table: the ZX Spectrum ROM font (fonts/zx-rom.ch8.hex.txt).
    // Alternative 8x8 Spectrum fonts ship in fonts/ and are swapped in with
    // setFontsData() — see the "Fonts" tutorial for the catalogue and the
    // .ch8 -> hex conversion pipeline.
    this.fontsData = '00000000000000000010101010001000002424000000000000247E24247E240000083E283E0A3E080062640810264600001028102A443A00000810000000000000040808080804000020101010102000000014083E081400000008083E0808000000000000080810000000003E00000000000000001818000000020408102000003C464A52623C000018280808083E00003C42023C407E00003C420C02423C0000081828487E0800007E407C02423C00003C407C42423C00007E020408101000003C423C42423C00003C42423E023C000000001000001000000010000010102000000408100804000000003E003E00000000100804081000003C420408000800003C4A565E403C00003C42427E424200007C427C42427C00003C424040423C000078444242447800007E407C40407E00007E407C40404000003C42404E423C000042427E42424200003E080808083E000002020242423C0000444870484442000040404040407E000042665A42424200004262524A464200003C424242423C00007C42427C404000003C4242524A3C00007C42427C444200003C403C02423C0000FE1010101010000042424242423C00004242424224180000424242425A240000422418182442000082442810101000007E040810207E00000E080808080E0000004020100804000070101010107000001038541010100000000000000000FF001C227820207E00000038043C443C000020203C22223C0000001C2020201C000004043C44443C000000384478403C00000C10181010100000003C44443C043800404078444444000010003010103800000400040404241800202830302824000010101010100C00000068545454540000007844444444000000384444443800000078444478404000003C44443C040600001C202020200000003840380478000010381010100C00000044444444380000004444282810000000445454542800000044281028440000004444443C043800007C0810207C00000E083008080E0000080808080808000070100C1010700000142800000000003C4299A1A199423C';
  } // constructor

  /**
   * Decodes a single character's glyph into a list of scaled pixel rectangles, applying
   * proportional left/right column trimming when proportional mode is enabled.
   * @param {string} char - The character to render; unknown characters fall back to '?'.
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
    var letter = this.fontsChars.indexOf(char);
    if (letter < 0) {
      letter = this.fontsChars.indexOf('?');
    }
    for (var y = 0; y < 8; y++) {
      binData.push(Tool.hexToBin(this.fontsData.substring(letter*16+y*2, letter*16+y*2+2)));
    }

    // convert for proportional font
    if (this.proportional == true) {

      // left cut
      var doIt = true;
      while (doIt == true) {
        for (var y = 0; y < 8; y++) {
          if (binData[y][0] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt == true) {
          for (var y = 0; y < 8; y++) {
            binData[y] = binData[y].substring(1);
          }
          width--;
        }
      }

      // right cut
      doIt = true;
      while (doIt == true) {
        for (var y = 0; y < 8; y++) {
          if (binData[y][binData[y].length-1] == bitMask) {
            doIt = false;
            break;
          }
        }
        if (doIt == true) {
          for (var y = 0; y < 8; y++) {
            binData[y] = binData[y].substring(0, width-1);
          }
          width--;
        }
      }
    }

    // convert binary to array
    binData.forEach ((mask, y) => {
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
   * Reports whether a character has a glyph in this font.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is part of the font's character set.
   */
  validChar(char) {
    if (char in this.spaces) {
      return true;
    }
    if (this.fontsChars.indexOf(char) >= 0) {
      return true;
    }
    return false;
  } // validChar

  /**
   * Replaces the base glyph data table, re-appending the extra glyph data.
   * @param {string} fontsData - Hex glyph data for the base character set.
   */
  setFontsData(fontsData) {
    this.fontsData = fontsData;
  } // setFontsData

  /**
   * Appends extra (non-ASCII) printable glyphs to the font. Each glyph is 16 hex
   * digits (8 rows x 1 byte). The core font ships ASCII only; games register their
   * own graphic glyphs this way. Call after setFontsData(), which replaces the table.
   * @param {string} chars - The characters to add, in the same order as their data.
   * @param {string} hexData - Concatenated 16-hex glyph bitmaps, one per character.
   */
  addGlyphs(chars, hexData) {
    this.fontsChars += chars;
    this.fontsData += hexData;
  } // addGlyphs

} // ZXFonts8x8

export default ZXFonts8x8;
