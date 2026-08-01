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

    // Space-like characters, keyed by char -> {width, breaking, stretch}.
    // These are never drawn (no pixels); which characters act as spaces is
    // font-specific, so the same character may be a blank space in one font
    // and a real, printable glyph in another.
    //   width   : glyph width in pixels for proportional rendering.
    //   breaking: line wrapping may break at this space.
    //   stretch : justified alignment distributes filler across this space.
    // When a font renders fixed-width (monospaced), monospaceWidth is used
    // instead of the per-space width. Subclasses populate these.
    this.spaces = {};
    this.monospaceWidth = 0;
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

  /**
   * Tests whether a character is a defined space in this font.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is a space.
   */
  isSpace(char) {
    return char in this.spaces;
  } // isSpace

  /**
   * Tests whether a character is a space at which line wrapping may break.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is a breaking space.
   */
  isBreakingSpace(char) {
    return (char in this.spaces) && this.spaces[char].breaking;
  } // isBreakingSpace

  /**
   * Tests whether a character is a space that justified alignment may stretch.
   * @param {string} char - The character to test.
   * @returns {boolean} True if the character is a stretchable space.
   */
  isStretchSpace(char) {
    return (char in this.spaces) && this.spaces[char].stretch;
  } // isStretchSpace

  /**
   * Returns glyph data for a defined space, or null when the character is not a
   * space. The width comes from the font's space table when rendering
   * proportionally, or from monospaceWidth when rendering fixed-width. A space
   * normally has no pixels, but under reverse-video rendering (bitMask '0') it
   * inverts to a solid block — matching how the former all-zero space glyph
   * behaved (so flashing reverse-colour text keeps blinking through its spaces).
   * @param {string} char - The character to look up.
   * @param {?string} bitMask - The set-pixel bit; '0' requests reverse video.
   *   Bitmap fonts pass their bitMask; table fonts pass null (never invert).
   * @param {number} scale - The rendering scale factor.
   * @returns {?{data: Array, width: number}} Space glyph data, or null.
   */
  spaceCharData(char, bitMask, scale) {
    if (!(char in this.spaces)) {
      return null;
    }
    var width = (this.proportional === false) ? this.monospaceWidth : this.spaces[char].width;
    var data = (bitMask === '0') ? [[0, 0, width*scale, this.charsHeight*scale]] : [];
    return {data: data, width: width*scale};
  } // spaceCharData

  /**
   * Registers a space-like character (rendered blank, no pixels) with its metrics.
   * The core library fonts ship with only the normal space; games use this to add
   * hard/short/custom spaces, choosing the marker character themselves.
   * @param {string} char - The character that acts as a space.
   * @param {{width: number, breaking?: boolean, stretch?: boolean}} opts - Metrics:
   *   width in pixels (proportional mode), breaking = line wrapping may break here,
   *   stretch = justified alignment may widen it.
   */
  addSpace(char, opts) {
    this.spaces[char] = {
      width: opts.width,
      breaking: opts.breaking === true,
      stretch: opts.stretch === true
    };
  } // addSpace

} // AbstractFonts

export default AbstractFonts;
