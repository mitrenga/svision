const { AbstractFonts } = await import('../../abstractFonts.js?ver='+window.srcVersion);
// begin code

/**
 * A 6-pixel-tall bitmap font for the canvas 2D platform: the 4x6 font of the
 * Arduino libraries (font4x6, 96 glyphs, ASCII 32-127 in a 4 x 6 cell with the
 * gap in the cell), with lower case and descenders in the sixth row. Each
 * character is defined in `fontsData` as a `{width, data}` entry, where
 * `data` is an array of `[x, y, width, height]` rectangles describing the
 * filled blocks that make up the glyph within its 6-pixel-high cell; the
 * glyphs are cut to their pixels (proportional), as in Fonts5x5.
 */
export class Fonts4x6 extends AbstractFonts {

  /**
   * Initializes the font metrics (height, spacing) and the glyph rectangle
   * table held in `fontsData`.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'Fonts4x6';

    this.charsHeight = 6;
    this.charsSpacing = 1;
    this.lineSpacing = 1;
    this.paragraphSpacing = 7;

    this.spaces = {
      ' ': {width: 2, breaking: true, stretch: true}   // normal (breaking) space; games add hard/short via addSpace()
    };

    this.fontsData = {
      '!': {width: 1, data: [[0,0,1,1], [0,1,1,1], [0,2,1,1], [0,4,1,1]]},
      '"': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1]]},
      '#': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,3,1], [0,2,1,1], [2,2,1,1], [0,3,3,1], [0,4,1,1], [2,4,1,1]]},
      '$': {width: 3, data: [[0,0,3,1], [0,1,2,1], [1,2,2,1], [0,3,3,1], [1,4,1,1]]},
      '%': {width: 3, data: [[0,0,1,1], [2,0,1,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [0,4,1,1], [2,4,1,1]]},
      '&': {width: 3, data: [[0,0,2,1], [0,1,2,1], [0,3,3,1], [0,4,3,1]]},
      '\'': {width: 2, data: [[1,0,1,1], [0,1,1,1]]},
      '(': {width: 2, data: [[1,0,1,1], [0,1,1,1], [0,2,1,1], [0,3,1,1], [1,4,1,1]]},
      ')': {width: 2, data: [[0,0,1,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '*': {width: 3, data: [[0,1,1,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [2,3,1,1]]},
      '+': {width: 3, data: [[1,1,1,1], [0,2,3,1], [1,3,1,1]]},
      ',': {width: 1, data: [[0,4,1,1], [0,5,1,1]]},
      '-': {width: 3, data: [[0,2,3,1]]},
      '.': {width: 1, data: [[0,4,1,1]]},
      '/': {width: 3, data: [[2,0,1,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '0': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      '1': {width: 2, data: [[1,0,1,1], [0,1,2,1], [1,2,1,1], [1,3,1,1], [1,4,1,1]]},
      '2': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,3,1]]},
      '3': {width: 3, data: [[0,0,2,1], [2,1,1,1], [0,2,2,1], [2,3,1,1], [0,4,2,1]]},
      '4': {width: 3, data: [[0,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,3,1], [2,3,1,1], [2,4,1,1]]},
      '5': {width: 3, data: [[0,0,3,1], [0,1,1,1], [1,2,2,1], [2,3,1,1], [0,4,3,1]]},
      '6': {width: 3, data: [[1,0,2,1], [0,1,1,1], [0,2,3,1], [0,3,1,1], [2,3,1,1], [0,4,2,1]]},
      '7': {width: 3, data: [[0,0,3,1], [2,1,1,1], [1,2,1,1], [1,3,1,1], [1,4,1,1]]},
      '8': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      '9': {width: 3, data: [[1,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,3,1], [2,3,1,1], [1,4,1,1]]},
      ':': {width: 1, data: [[0,1,1,1], [0,4,1,1]]},
      ';': {width: 1, data: [[0,1,1,1], [0,4,1,1], [0,5,1,1]]},
      '<': {width: 3, data: [[2,0,1,1], [1,1,1,1], [0,2,1,1], [1,3,1,1], [2,4,1,1]]},
      '=': {width: 3, data: [[0,1,3,1], [0,3,3,1]]},
      '>': {width: 3, data: [[0,0,1,1], [1,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '?': {width: 3, data: [[0,0,3,1], [2,1,1,1], [1,2,1,1], [1,4,1,1]]},
      '@': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [1,4,2,1]]},
      'A': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,3,1], [0,4,1,1], [2,4,1,1]]},
      'B': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1], [0,3,1,1], [2,3,1,1], [0,4,2,1]]},
      'C': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'D': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,2,1]]},
      'E': {width: 3, data: [[0,0,3,1], [0,1,1,1], [0,2,2,1], [0,3,1,1], [0,4,3,1]]},
      'F': {width: 3, data: [[0,0,3,1], [0,1,1,1], [0,2,3,1], [0,3,1,1], [0,4,1,1]]},
      'G': {width: 3, data: [[1,0,2,1], [0,1,1,1], [0,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,2,1]]},
      'H': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,3,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'I': {width: 3, data: [[0,0,3,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [0,4,3,1]]},
      'J': {width: 3, data: [[0,0,3,1], [2,1,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'K': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,2,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'L': {width: 3, data: [[0,0,1,1], [0,1,1,1], [0,2,1,1], [0,3,1,1], [0,4,3,1]]},
      'M': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,3,1], [0,2,3,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'N': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'O': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'P': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1], [0,3,1,1], [0,4,1,1]]},
      'Q': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1], [2,5,1,1]]},
      'R': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'S': {width: 3, data: [[1,0,2,1], [0,1,1,1], [1,2,1,1], [2,3,1,1], [0,4,2,1]]},
      'T': {width: 3, data: [[0,0,3,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [1,4,1,1]]},
      'U': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,3,1]]},
      'V': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'W': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,3,1], [0,3,3,1], [0,4,1,1], [2,4,1,1]]},
      'X': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'Y': {width: 3, data: [[0,0,1,1], [2,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,3,1], [1,3,1,1], [1,4,1,1]]},
      'Z': {width: 3, data: [[0,0,3,1], [2,1,1,1], [1,2,1,1], [0,3,1,1], [0,4,3,1]]},
      '[': {width: 2, data: [[0,0,2,1], [0,1,1,1], [0,2,1,1], [0,3,1,1], [0,4,2,1]]},
      '\\': {width: 3, data: [[0,0,1,1], [0,1,1,1], [1,2,1,1], [2,3,1,1], [2,4,1,1]]},
      ']': {width: 2, data: [[0,0,2,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [0,4,2,1]]},
      '^': {width: 3, data: [[1,1,1,1], [0,2,1,1], [2,2,1,1]]},
      '_': {width: 3, data: [[0,4,3,1]]},
      '`': {width: 2, data: [[0,1,1,1], [1,2,1,1]]},
      'a': {width: 3, data: [[1,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,2,1]]},
      'b': {width: 3, data: [[0,0,1,1], [0,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'c': {width: 3, data: [[1,1,2,1], [0,2,1,1], [0,3,1,1], [1,4,2,1]]},
      'd': {width: 3, data: [[2,0,1,1], [1,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'e': {width: 3, data: [[1,1,2,1], [0,2,3,1], [0,3,1,1], [0,4,3,1]]},
      'f': {width: 3, data: [[1,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [0,3,2,1], [0,4,1,1]]},
      'g': {width: 3, data: [[1,1,1,1], [0,2,1,1], [2,2,1,1], [1,3,1,1], [2,4,1,1], [1,5,1,1]]},
      'h': {width: 3, data: [[0,0,1,1], [0,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'i': {width: 1, data: [[0,0,1,1], [0,2,1,1], [0,3,1,1], [0,4,1,1]]},
      'j': {width: 2, data: [[1,0,1,1], [1,2,1,1], [1,3,1,1], [1,4,1,1], [0,5,1,1]]},
      'k': {width: 3, data: [[0,0,1,1], [0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,2,1], [0,4,1,1], [2,4,1,1]]},
      'l': {width: 2, data: [[0,0,2,1], [1,1,1,1], [1,2,1,1], [1,3,1,1], [1,4,1,1]]},
      'm': {width: 3, data: [[0,1,3,1], [0,2,3,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'n': {width: 3, data: [[0,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'o': {width: 3, data: [[1,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'p': {width: 3, data: [[0,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [0,4,2,1], [0,5,1,1]]},
      'q': {width: 3, data: [[1,1,2,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,2,1], [2,5,1,1]]},
      'r': {width: 3, data: [[1,1,2,1], [0,2,1,1], [0,3,1,1], [0,4,1,1]]},
      's': {width: 3, data: [[1,1,2,1], [0,2,1,1], [2,3,1,1], [0,4,2,1]]},
      't': {width: 3, data: [[1,0,1,1], [0,1,3,1], [1,2,1,1], [1,3,1,1], [1,4,1,1]]},
      'u': {width: 3, data: [[0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,2,1]]},
      'v': {width: 3, data: [[0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,1,1], [2,3,1,1], [1,4,1,1]]},
      'w': {width: 3, data: [[0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [0,3,3,1], [0,4,3,1]]},
      'x': {width: 3, data: [[0,1,1,1], [2,1,1,1], [1,2,1,1], [1,3,1,1], [0,4,1,1], [2,4,1,1]]},
      'y': {width: 3, data: [[0,1,1,1], [2,1,1,1], [0,2,1,1], [2,2,1,1], [1,3,2,1], [2,4,1,1], [1,5,1,1]]},
      'z': {width: 3, data: [[0,1,3,1], [2,2,1,1], [0,3,1,1], [0,4,3,1]]},
      '{': {width: 3, data: [[2,0,1,1], [1,1,1,1], [0,2,2,1], [1,3,1,1], [2,4,1,1]]},
      '|': {width: 1, data: [[0,0,1,1], [0,1,1,1], [0,2,1,1], [0,3,1,1], [0,4,1,1]]},
      '}': {width: 3, data: [[0,0,1,1], [1,1,1,1], [1,2,2,1], [1,3,1,1], [0,4,1,1]]},
      '~': {width: 4, data: [[1,1,1,1], [3,1,1,1], [0,2,1,1], [2,2,1,1]]}
    };
  } // constructor

  /**
   * Returns the rendering data for a single character at the given scale.
   * Falls back to the upper case and then to '?' when the character is not
   * present in the font. The returned object holds the scaled width and an
   * array of scaled `[x, y, width, height]` rectangles to draw.
   * @param {string} char - The character to render.
   * @param {*} bitMask - Unused for this font (kept for API compatibility).
   * @param {number} scale - The scale factor applied to widths and rectangles.
   * @returns {Object} An object with `width` and `data` (array of rectangles).
   */
  getCharData(char, bitMask, scale) {
    var spaceData = this.spaceCharData(char, null, scale);
    if (spaceData !== null) {
      return spaceData;
    }

    var validChar = char;
    if (!(validChar in this.fontsData)) {
      validChar = char.toUpperCase();
    }
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
    if (char in this.spaces) {
      return true;
    }
    if (char in this.fontsData) {
      return true;
    }
    return false;
  } // validChar

  /**
   * Adds extra glyphs to the font's glyph table. The core font ships ASCII only;
   * games register their own graphic glyphs this way.
   * @param {Object} glyphs - Map of char -> {width, data} entries to merge in.
   */
  addGlyphs(glyphs) {
    Object.assign(this.fontsData, glyphs);
  } // addGlyphs

} // Fonts4x6
