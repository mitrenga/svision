/**/

/*/

/**/
// begin code

/**
 * Base class for a font provider. Holds character/line/paragraph spacing
 * metrics and defines the interface for looking up glyph data and validating
 * characters. Subclasses supply the concrete glyph tables.
 */
export class AbstractFonts {

  /**
   * Creates the font provider and initializes the spacing metrics.
   * @param {AbstractApp} app - The owning application.
   */
  constructor(app) {
    this.id = 'AbstractFonts';

    this.app = app;
    this.charsHeight = 0; 
    this.charsSpacing = 0;
    this.lineSpacing = 0;
    this.paragraphSpacing = 0;
  } // constructor

  /**
   * Returns glyph data for a character. The base implementation returns a zero-width placeholder.
   * @param {string} char - The character to look up.
   * @param {number} bitMask - Bit mask selecting which glyph variant/planes to use.
   * @param {number} scale - The rendering scale factor.
   * @returns {{width: number}} The glyph data, including its width.
   */
  getCharData(char, bitMask, scale) {
    return {width: 0};
  } // getCharData

  /**
   * Tests whether a character is supported by this font. The base implementation returns false.
   * @param {string} char - The character to validate.
   * @returns {boolean} True if the character is supported, false otherwise.
   */
  validChar(char) {
    return false;
  } // validChar

} // AbstractFonts

export default AbstractFonts;
