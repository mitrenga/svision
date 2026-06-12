/**/
const { AbstractFonts } = await import('../../abstractFonts.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../abstractFonts.js';
/**/
// begin code

/**
 * A 3-pixel-tall bitmap font for the canvas 2D platform. Each character is
 * defined in `fontsData` as a `{width, data}` entry, where `data` is an array
 * of `[x, y, width, height]` rectangles describing the filled blocks that make
 * up the glyph within its 3-pixel-high cell.
 */
export class Fonts3x3 extends AbstractFonts {

  /**
   * Initializes the font metrics (height, spacing) and the glyph rectangle
   * table held in `fontsData`.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'Fonts3x3';
    
    this.charsHeight = 3; 
    this.charsSpacing = 1;
    this.lineSpacing = 2;
    this.paragraphSpacing = 5;

    this.fontsData = {
      ' ': {width: 1, data: []},
      '\'': {width: 1, data: [[0,0,1,2]]},
      '+': {width: 3, data: [[1,0,1,1], [0,1,3,1], [1,2,1,1]]},
      ',': {width: 1, data: [[1,1,1,2]]},
      '-': {width: 2, data: [[0,1,2,1]]},
      '.': {width: 1, data: [[0,2,1,1]]},
      '/': {width: 3, data: [[2,0,1,1], [1,1,1,1], [0,2,1,1]]},
      '0': {width: 3, data: [[0,0,3,1], [0,1,1,1], [2,1,1,1], [0,2,3,1]]},
      '1': {width: 3, data: [[0,0,2,1], [1,1,1,1], [0,2,3,1]]},
      '2': {width: 3, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '3': {width: 3, data: [[0,0,3,1], [1,1,2,1], [0,2,3,1]]},
      '4': {width: 3, data: [[0,0,1,2], [1,1,1,1], [2,0,1,3]]},
      '5': {width: 3, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      '6': {width: 3, data: [[0,0,1,3], [1,1,2,2]]},
      '7': {width: 3, data: [[0,0,2,1], [2,0,1,3]]},
      '8': {width: 3, data: [[1,0,2,1], [0,1,3,2]]},
      '9': {width: 3, data: [[0,0,3,2], [2,2,1,1]]},
      ':': {width: 1, data: [[0,0,1,1], [0,2,1,1]]},
      '<': {width: 2, data: [[0,1,1,1], [1,0,1,1], [1,2,1,1]]},
      '=': {width: 3, data: [[0,0,3,1], [0,2,3,1]]},
      '>': {width: 2, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1]]},
      '?': {width: 2, data: [[0,0,2,1], [1,2,1,1]]},
      'A': {width: 3, data: [[0,1,1,2], [1,0,1,2], [2,1,1,2]]},
      'B': {width: 3, data: [[0,0,2,1], [0,1,3,2]]},
      'C': {width: 3, data: [[0,0,3,1], [0,1,1,1], [0,2,3,1]]},
      'D': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1]]},
      'E': {width: 3, data: [[0,0,2,3], [2,0,1,1], [2,2,1,1]]},
      'F': {width: 3, data: [[0,0,1,3], [1,0,1,2], [2,0,1,1]]},
      'G': {width: 3, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,1,1,2]]},
      'H': {width: 3, data: [[0,0,1,3], [1,1,1,1], [2,0,1,3]]},
      'I': {width: 1, data: [[0,0,1,3]]},
      'J': {width: 3, data: [[0,1,1,2], [1,2,1,1], [2,0,1,3]]},
      'K': {width: 3, data: [[0,0,1,3], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'L': {width: 3, data: [[0,0,1,3], [1,2,2,1]]},
      'M': {width: 3, data: [[0,0,1,3], [1,0,1,2], [2,0,1,3]]},
      'N': {width: 3, data: [[0,0,1,3], [1,0,1,1], [2,0,1,3]]},
      'O': {width: 3, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,0,1,3]]},
      'P': {width: 3, data: [[0,0,3,2], [0,2,1,1]]},
      'Q': {width: 3, data: [[0,0,3,2], [2,2,1,1]]},
      'R': {width: 3, data: [[0,0,1,3], [1,0,2,1]]},
      'S': {width: 3, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      'T': {width: 3, data: [[0,0,3,1], [1,1,1,2]]},
      'U': {width: 3, data: [[0,0,1,3], [1,2,1,1], [2,0,1,3]]},
      'V': {width: 3, data: [[0,0,1,2], [1,2,1,1], [2,0,1,2]]},
      'W': {width: 3, data: [[0,0,1,3], [1,1,1,2], [2,0,1,3]]},
      'X': {width: 3, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'Y': {width: 3, data: [[0,0,1,1], [1,1,1,2], [2,0,1,1]]},
      'Z': {width: 3, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '[': {width: 2, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1]]},
      '\\': {width: 3, data: [[[0,0,1,1], [1,1,1,1], [2,2,1,1]]]},
      ']': {width: 2, data: [[0,0,1,1], [0,2,1,1], [1,0,1,3]]},
      '^': {width: 3, data: [[0,1,1,1], [1,0,1,1], [2,1,1,1]]},
      '_': {width: 3, data: [[0,2,3,1]]},
      '\u00A0': {width: 1, data: []},
      '‗': {width: 2, data: [[0,2,2,1]]},
      '←': {width: 2, data: [[0,1,1,1], [1,0,1,3]]},
      '↓': {width: 3, data: [[0,1,3,1], [1,2,1,1]]},
      '↑': {width: 3, data: [[1,0,1,1], [0,1,3,1]]},
      '➔': {width: 2, data: [[0,0,1,3], [1,1,1,1]]},
      '█': {width: 2, data: [[0,0,2,3]]},
      '▲': {width: 2, data: [[1,0,1,1], [0,1,3,1], [0,2,3,1]]},
      '▼': {width: 2, data: [[0,0,3,1], [0,1,3,1], [1,2,1,1]]},
      '◀': {width: 2, data: [[1,0,2,1], [0,1,3,1], [1,2,2,1]]},
      '▶': {width: 2, data: [[0,0,2,1], [0,1,3,1], [0,2,2,1]]},
      '◢': {width: 2, data: [[2,0,1,1], [1,1,2,1], [0,2,3,1]]},
      '◣': {width: 2, data: [[0,0,1,1], [0,1,2,1], [0,2,3,1]]},
      '◥': {width: 2, data: [[0,0,3,1], [1,1,2,1], [2,2,1,1]]},
      '◤': {width: 2, data: [[0,0,3,1], [0,1,2,1], [0,2,1,1]]}
    }
  } // constructor

  /**
   * Returns the rendering data for a single character, scaled by `scale`.
   * Falls back to '?' when the character is not present in the font. The
   * returned object holds the scaled width and an array of scaled
   * `[x, y, width, height]` rectangles to draw.
   * @param {string} char - The character to render.
   * @param {*} bitMask - Unused for this font (kept for API compatibility).
   * @param {number} scale - The scale factor applied to widths and rectangles.
   * @returns {Object} An object with `width` and `data` (array of rectangles).
   */
  getCharData(char, bitMask, scale) {
    var validChar = char.toUpperCase();
    if (!(validChar in this.fontsData)) {
      validChar = '?';
    }
    var charObject = {};
    charObject.width = this.fontsData[validChar].width*scale;

    charObject.data = [];
    for (var x = 0; x < this.fontsData[validChar].data.length; x++) {
      var piece = this.fontsData[validChar].data[x];
      charObject.data.push([piece[0]*scale, piece[1]*scale, piece[2]*scale, piece[3]*scale]);
    }

    return charObject;
  } // getCharData

  /**
   * Tests whether the given character has a glyph defined in this font.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is defined, otherwise false.
   */
  validChar(char) {
    if (char in this.fontsData) {
      return true;
    }
    return false;
  } // validChar

} // Fonts3x3

export default Fonts3x3;
