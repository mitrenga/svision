/**/
const { AbstractFonts } = await import('../../abstractFonts.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../abstractFonts.js';
/**/
// begin code

/**
 * A 5-pixel-tall bitmap font for the canvas 2D platform. Each character is
 * defined in `fontsData` as a `{width, data}` entry, where `data` is an array
 * of `[x, y, width, height]` rectangles describing the filled blocks that make
 * up the glyph within its 5-pixel-high cell.
 */
export class Fonts5x5 extends AbstractFonts {

  /**
   * Initializes the font metrics (height, spacing) and the glyph rectangle
   * table held in `fontsData`.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'Fonts5x5';

    this.charsHeight = 5; 
    this.charsSpacing = 1;
    this.lineSpacing = 2;
    this.paragraphSpacing = 7;
    
    this.fontsData = {
      ' ': {width: 2, data: []},
      '!': {width: 1, data: [[0,0,1,3], [0,4,1,1]]},
      '"': {width: 3, data: [[0,0,1,2], [2,0,1,2]]},
      '#': {width: 5, data: [[0,1,5,1], [0,3,5,1], [1,0,1,1], [3,0,1,1], [1,2,1,1], [3,2,1,1], [1,4,1,1], [3,4,1,1]]},
      '$': {width: 5, data: [[1,0,3,1], [0,1,1,1], [1,2,3,1], [4,3,1,1], [1,4,3,1], [2,1,1,1], [2,3,1,1]]},
      '%': {width: 5, data: [[0,0,1,1], [0,4,1,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,1], [4,4,1,1]]},
      '&': {width: 4, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [2,3,2,1], [1,4,3,1]]},
      '\'': {width: 1, data: [[0,0,1,2]]},
      '(': {width: 2, data: [[0,1,1,3], [1,0,1,1], [1,4,1,1]]},
      ')': {width: 2, data: [[0,0,1,1], [1,1,1,3], [0,4,1,1]]},
      '*': {width: 3, data: [[0,1,1,1], [1,2,1,1], [2,3,1,1], [0,3,1,1], [2,1,1,1]]},
      '+': {width: 3, data: [[0,2,3,1], [1,1,1,1], [1,3,1,1]]},
      ',': {width: 1, data: [[0,4,1,2]]},
      '-': {width: 3, data: [[0,2,3,1]]},
      '.': {width: 1, data: [[0,4,1,1]]},
      '/': {width: 5, data: [[0,4,1,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,1]]},
      '0': {width: 4, data: [[0,1,1,3], [1,0,2,1], [3,1,1,3], [1,4,2,1]]},
      '1': {width: 3, data: [[0,1,1,1], [1,0,1,4], [0,4,3,1]]},
      '2': {width: 4, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,4,1]]},
      '3': {width: 4, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [3,3,1,1], [1,4,2,1], [0,3,1,1]]},
      '4': {width: 4, data: [[0,0,1,4], [1,3,3,1], [2,2,1,1], [2,4,1,1]]},
      '5': {width: 4, data: [[0,0,4,1], [0,1,1,2], [1,2,1,1], [2,2,1,1], [3,3,1,1], [0,4,3,1]]},
      '6': {width: 4, data: [[1,0,2,1], [0,1,1,3], [1,4,2,1], [3,3,1,1], [1,2,2,1]]},
      '7': {width: 4, data: [[0,0,4,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '8': {width: 4, data: [[1,0,2,1], [0,1,1,1], [0,3,1,1], [1,4,2,1], [3,3,1,1], [1,2,2,1], [3,1,1,1]]},
      '9': {width: 4, data: [[1,0,2,1], [0,1,1,1], [3,1,1,3], [1,2,2,1], [1,4,2,1]]},
      ':': {width: 1, data: [[0,1,1,1], [0,3,1,1]]},
      ';': {width: 1, data: [[0,2,1,1], [0,4,1,2]]},
      '<': {width: 3, data: [[0,2,1,1], [1,1,1,1], [2,0,1,1], [1,3,1,1], [2,4,1,1]]},
      '=': {width: 3, data: [[0,1,3,1], [0,3,3,1]]},
      '>': {width: 3, data: [[0,0,1,1], [1,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '?': {width: 3, data: [[0,0,2,1], [2,1,1,1], [1,2,1,1], [1,4,1,1]]},
      '@': {width: 5, data: [[2,1,1,1], [2,2,2,1], [4,1,1,1], [1,0,3,1], [0,1,1,3], [1,4,3,1]]},
      'A': {width: 5, data: [[1,0,3,1], [0,1,1,4], [1,3,3,1], [4,1,1,4]]},
      'B': {width: 5, data: [[0,0,1,5], [1,0,3,1], [4,1,1,1], [1,2,3,1], [4,3,1,1], [1,4,3,1]]},
      'C': {width: 4, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1]]},
      'D': {width: 5, data: [[0,0,1,5], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'E': {width: 4, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1], [1,4,3,1]]},
      'F': {width: 4, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1]]},
      'G': {width: 5, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1], [4,3,1,1], [2,2,3,1]]},
      'H': {width: 5, data: [[0,0,1,5], [1,2,3,1], [4,0,1,5]]},
      'I': {width: 1, data: [[0,0,1,5]]},
      'J': {width: 3, data: [[2,0,1,4], [0,4,2,1]]},
      'K': {width: 4, data: [[0,0,1,5], [3,0,1,1], [2,1,1,1], [1,2,1,1], [2,3,1,1], [3,4,1,1]]},
      'L': {width: 4, data: [[0,0,1,5], [1,4,3,1]]},
      'M': {width: 5, data: [[0,0,1,5], [1,1,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,5]]},
      'N': {width: 5, data: [[0,0,1,5], [4,0,1,5], [1,1,1,1], [2,2,1,1], [3,3,1,1]]},
      'O': {width: 5, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'P': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4,1,1,1]]},
      'Q': {width: 5, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,4,1], [3,3,1,1]]},
      'R': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4,1,1,1], [2,3,1,1], [3,4,2,1]]},
      'S': {width: 5, data: [[1,0,3,1], [0,1,1,1], [1,2,3,1], [4,3,1,1], [0,4,4,1]]},
      'T': {width: 5, data: [[0,0,5,1], [2,1,1,4]]},
      'U': {width: 5, data: [[0,0,1,4], [1,4,3,1], [4,0,1,4]]},
      'V': {width: 5, data: [[0,0,1,3], [1,3,1,1], [2,4,1,1], [3,3,1,1], [4,0,1,3]]},
      'W': {width: 5, data: [[0,0,1,4], [1,4,1,1], [2,3,1,1], [3,4,1,1], [4,0,1,4]]},
      'X': {width: 5, data: [[0,0,1,1], [1,1,1,1], [2,2,1,1], [3,3,1,1], [4,4,1,1], [4,0,1,1], [3,1,1,1], [1,3,1,1], [0,4,1,1]]},
      'Y': {width: 5, data: [[0,0,1,2], [4,0,1,2], [1,2,3,1], [2,3,1,2]]},
      'Z': {width: 5, data: [[0,0,5,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [0,4,5,1]]},
      '[': {width: 2, data: [[0,0,2,1], [0,1,1,3], [0,4,2,1]]},
      '\\': {width: 5, data: [[0,0,1,1], [1,1,1,1], [2,2,1,1], [3,3,1,1], [4,4,1,1]]},
      ']': {width: 2, data: [[0,0,2,1], [1,1,1,3], [0,4,2,1]]},
      '^': {width: 3, data: [[0,1,1,1], [1,0,1,1], [2,1,1,1]]},
      '_': {width: 4, data: [[0,4,4,1]]},
      '£': {width: 3, data: [[1,0,2,1], [0,1,1,3], [0,4,3,1], [1,2,1,1]]},
      '{': {width: 3, data: [[0,2,1,1], [1,0,2,1], [1,1,1,3], [1,4,2,1]]},
      '|': {width: 1, data: [[0,0,1,5]]},
      '}': {width: 3, data: [[0,0,2,1], [1,1,1,3], [0,4,2,1], [2,2,1,1]]},
      '~': {width: 5, data: [[0,2,1,1], [1,1,1,1], [2,2,1,1], [3,3,1,1], [4,2,1,1]]},
      '©': {width: 6, data: [[1,0,4,1], [0,1,2,3], [1,4,4,1], [4,1,2,3], [3,2,1,1]]},
      '\u00A0': {width: 2, data: []},
      '‗': {width: 3, data: [[0,4,3,1]]},
      '←': {width: 6, data: [[0,2,6,1], [1,1,1,3], [2,0,1,5]]},
      '↓': {width: 5, data: [[2,0,1,5], [1,3,3,1], [0,2,5,1]]},
      '↑': {width: 5, data: [[2,0,1,5], [1,1,3,1], [0,2,5,1]]},
      '➔': {width: 6, data: [[0,2,6,1], [4,1,1,3], [3,0,1,5]]},
      '█': {width: 4, data: [[0,0,4,5]]},
      '▲': {width: 4, data: [[2,0,1,1], [2,1,1,1], [1,2,3,1], [1,3,3,1], [0,4,5,1]]},
      '▼': {width: 4, data: [[0,0,5,1], [1,1,3,1], [1,2,3,1], [2,3,1,1], [2,4,1,1]]},
      '◀': {width: 4, data: [[4,0,1,1], [2,1,3,1], [0,2,5,1], [2,3,3,1], [4,4,1,1]]},
      '▶': {width: 4, data: [[0,0,1,1], [0,1,3,1], [0,2,5,1], [0,3,3,1], [0,4,1,1]]},
      '◢': {width: 4, data: [[4,0,1,1], [3,1,2,1], [2,2,3,1], [1,3,4,1], [0,4,5,1]]},
      '◣': {width: 4, data: [[0,0,1,1], [0,1,2,1], [0,2,3,1], [0,3,4,1], [0,4,5,1]]},
      '◥': {width: 4, data: [[0,0,5,1], [1,1,4,1], [2,2,3,1], [3,3,2,1], [4,4,1,1]]},
      '◤': {width: 4, data: [[0,0,5,1], [0,1,4,1], [0,2,3,1], [0,3,2,1], [0,4,1,1]]}
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

} // Fonts5x5

export default Fonts5x5;
