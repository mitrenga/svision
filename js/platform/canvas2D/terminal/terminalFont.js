const { AbstractFonts } = await import('../../../abstractFonts.js?ver='+window.srcVersion);
// begin code

/**
 * The character generator of a text terminal, handed over by the application:
 * glyph bytes, how big a glyph is and where it sits in its cell. Nothing here
 * belongs to one terminal — the 7x8 glyphs in 10x11 cells of the Soviet
 * 15IE-00-013 and the 8x16 glyphs in 8x16 cells of a VGA font are two
 * configurations of the same class (R-061).
 *
 * ```js
 * var font = new TerminalFont(app, {
 *   data: romBytes,       // Uint8Array, one byte a glyph row
 *   count: 256,           // glyphs in the data
 *   bytesPerGlyph: 8,     // bytes from one glyph to the next
 *   glyphWidth: 7,        // pixels of a row that are drawn
 *   glyphHeight: 8,       // rows of a glyph that are drawn
 *   firstBit: 7,          // the bit of the leftmost pixel; the next ones go down
 *   cellWidth: 10,        // the cell the glyph sits in
 *   cellHeight: 11,
 *   glyphX: 0,            // where in the cell
 *   glyphY: 0,
 *   chars: {'A': 0x41}    // optional: character -> glyph, for TextEntity
 * });
 * ```
 *
 * A glyph row is at most 8 pixels wide, one byte, which is what every
 * character ROM of the era has. {@link TerminalFont.fromGlyphSource} builds the
 * data from a font of the library that has `glyphBytes(codePoint)` —
 * {@link VGAFonts8x16} — so a demo needs no ROM.
 *
 * ## Two doors into it
 *
 * - {@link TerminalFont#glyphRow} gives a row of a glyph by its index — what
 *   {@link TerminalScreen} paints the screen with.
 * - {@link AbstractFonts#getCharData} makes it a font of the library: a
 *   `TextEntity` or a dialog prints with the terminal's own glyphs (R-056),
 *   always fixed width, a character a cell. Which glyph a character is comes
 *   from `chars`; {@link TerminalCharset#charMap} makes one.
 *
 * Free of DOM, loadable under Node (R-001).
 */
export class TerminalFont extends AbstractFonts {

  /**
   * @param {Object} app - The application instance; may be null under Node.
   * @param {Object} config - The settings above; `data`, `glyphWidth` and
   *        `glyphHeight` are required.
   */
  constructor(app, config) {
    super(app);
    this.id = 'TerminalFont';

    var c = Object.assign({
      bytesPerGlyph: config.glyphHeight,
      firstBit: 7,
      cellWidth: config.glyphWidth,
      cellHeight: config.glyphHeight,
      glyphX: 0,
      glyphY: 0,
      chars: {}
    }, config);
    if (!(c.glyphWidth >= 1 && c.glyphWidth <= 8) || c.firstBit-c.glyphWidth+1 < 0) {
      throw new Error('TerminalFont: a glyph row is one byte, at most 8 pixels');
    }
    if (c.glyphX+c.glyphWidth > c.cellWidth || c.glyphY+c.glyphHeight > c.cellHeight) {
      throw new Error('TerminalFont: the glyph does not fit its cell');
    }

    this.glyphWidth = c.glyphWidth;
    this.glyphHeight = c.glyphHeight;
    this.cellWidth = c.cellWidth;
    this.cellHeight = c.cellHeight;
    this.glyphX = c.glyphX;
    this.glyphY = c.glyphY;
    /** glyphs in the font */
    this.count = c.count === undefined ? Math.floor(c.data.length/c.bytesPerGlyph) : c.count;
    /** character -> glyph index, for getCharData() */
    this.chars = c.chars;

    /**
     * the rows normalised: `glyphHeight` bytes a glyph, bit (glyphWidth-1)
     * the leftmost pixel, nothing outside the glyph width
     */
    this.rows = new Uint8Array(this.count*this.glyphHeight);
    var shift = c.firstBit-this.glyphWidth+1;
    var mask = (1 << this.glyphWidth)-1;
    for (var g = 0; g < this.count; g++) {
      for (var y = 0; y < this.glyphHeight; y++) {
        var at = g*c.bytesPerGlyph+y;
        this.rows[g*this.glyphHeight+y] = at < c.data.length ? (c.data[at] >> shift) & mask : 0;
      }
    }

    // the library's font metrics: a character a cell, lines a cell apart
    this.proportional = false;
    this.charsHeight = this.cellHeight;
    this.paragraphSpacing = this.cellHeight;
    this.monospaceWidth = this.cellWidth;
    this.spaces = {
      ' ': {width: this.cellWidth, breaking: true, stretch: true}
    };
  } // constructor

  /**
   * Builds a terminal font from a font with `glyphBytes(codePoint)` (bit 7 the
   * leftmost pixel, a byte a row), taking the glyphs of the given code points
   * in order: glyph index i is `codePoints[i]`, and `chars` maps them back.
   * @param {Object} app - The application instance; may be null under Node.
   * @param {Object} source - E.g. {@link VGAFonts8x16}.
   * @param {Array<number>} codePoints - The code points, one per glyph index.
   * @param {Object} config - `glyphWidth`, `glyphHeight` and the cell, as for the constructor.
   * @returns {TerminalFont} The font.
   */
  static fromGlyphSource(app, source, codePoints, config) {
    var height = config.glyphHeight;
    var data = new Uint8Array(codePoints.length*height);
    var chars = {};
    codePoints.forEach((codePoint, index) => {
      data.set(source.glyphBytes(codePoint).subarray(0, height), index*height);
      var ch = String.fromCodePoint(codePoint);
      if (!(ch in chars)) {
        chars[ch] = index;
      }
    });
    return new TerminalFont(app, Object.assign({chars: chars}, config,
      {data: data, count: codePoints.length, bytesPerGlyph: height, firstBit: 7}));
  } // fromGlyphSource

  /**
   * One row of a glyph.
   * @param {number} index - The glyph index; one outside the font is blank.
   * @param {number} line - 0 to glyphHeight-1.
   * @returns {number} The row mask, bit (glyphWidth-1) the leftmost pixel.
   */
  glyphRow(index, line) {
    if (index < 0 || index >= this.count || line < 0 || line >= this.glyphHeight) {
      return 0;
    }
    return this.rows[index*this.glyphHeight+line];
  } // glyphRow

  /**
   * Whether a pixel of a cell is lit — the glyph placed in its cell.
   * @param {number} index - The glyph index.
   * @param {number} x - 0 to cellWidth-1.
   * @param {number} y - 0 to cellHeight-1.
   * @returns {boolean} True for a pixel in the foreground colour.
   */
  cellPixel(index, x, y) {
    var gx = x-this.glyphX;
    var gy = y-this.glyphY;
    if (gx < 0 || gx >= this.glyphWidth) {
      return false;
    }
    return (this.glyphRow(index, gy) & (1 << (this.glyphWidth-1-gx))) !== 0;
  } // cellPixel

  /**
   * Rendering data of a character for a `TextEntity`: a rectangle for every
   * pixel of the cell that equals `bitMask` — the lit ones for '1', the dark
   * ones for '0' (reverse video). A character the font has no glyph for
   * prints as '?', or blank when there is no '?' either.
   * @param {string} char - The character.
   * @param {string} bitMask - '1' or '0'.
   * @param {number} scale - The scale of the rectangles.
   * @returns {Object} `{width, data}`.
   */
  getCharData(char, bitMask, scale) {
    var spaceData = this.spaceCharData(char, bitMask, scale);
    if (spaceData !== null) {
      return spaceData;
    }
    var index = char in this.chars ? this.chars[char] : ('?' in this.chars ? this.chars['?'] : -1);
    var data = [];
    for (var y = 0; y < this.cellHeight; y++) {
      for (var x = 0; x < this.cellWidth; x++) {
        if ((this.cellPixel(index, x, y) ? '1' : '0') === bitMask) {
          data.push([x*scale, y*scale, scale, scale]);
        }
      }
    }
    return {data: data, width: this.cellWidth*scale};
  } // getCharData

  /**
   * Whether the font has a glyph for a character.
   * @param {string} char - The character.
   * @returns {boolean} True when it prints as itself.
   */
  validChar(char) {
    return (char in this.spaces) || (char in this.chars);
  } // validChar

} // TerminalFont
