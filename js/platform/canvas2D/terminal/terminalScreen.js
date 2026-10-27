// begin code

/**
 * The screen memory of a text terminal: a grid of glyph indexes, a cursor and
 * an optional status line — what the firmware of the terminal keeps and its
 * video circuit shows. The size comes from the application (R-061): 80x24
 * with a status line on top for the 15IE-00-013, 80x25 for a demo, anything
 * else for the next terminal.
 *
 * A cell holds a **glyph index**, not the byte that came down the line: the
 * shift (SO/SI) was in force when the byte arrived and is part of what the
 * cell shows, so {@link TerminalVT52} resolves it through the
 * {@link TerminalCharset} before it writes here. A terminal has no attributes
 * — one foreground, one background for the whole screen.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas, so a match tool under Node
 * builds the same screen the browser shows (R-001). {@link TerminalScreen#snapshot}
 * is the state a tool compares; {@link TerminalScreen#paint32} draws it with a
 * {@link TerminalFont} into a buffer of pixels, which
 * {@link TerminalScreenEntity} blits.
 *
 * ```js
 * var screen = new TerminalScreen({cols: 80, rows: 24, statusLine: 'top',
 *   cursor: {lines: [8, 10]}});
 * screen.putGlyph(0, 0, 0x41);
 * ```
 */
export class TerminalScreen {

  /**
   * @param {Object} config - `cols` and `rows` (required); `statusLine`:
   *        false (default), 'top' or 'bottom'; `blank`: the glyph of an empty
   *        cell, 0x20 by default; `cursor`: `{lines: [first, last], x, width}`
   *        within the cell — by default the last row of the cell under the
   *        glyph — or null for a terminal that shows none.
   */
  constructor(config) {
    this.id = 'TerminalScreen';

    var c = Object.assign({
      statusLine: false,
      blank: 0x20,
      cursor: {}
    }, config);
    if (!(c.cols > 0 && c.rows > 0)) {
      throw new Error('TerminalScreen: cols and rows are required');
    }
    this.cols = c.cols;
    this.rows = c.rows;
    this.statusLine = c.statusLine === 'top' || c.statusLine === 'bottom' ? c.statusLine : false;
    this.blank = c.blank;
    this.cursorShape = c.cursor;

    /** the text, row by row */
    this.cells = new Uint16Array(this.cols*this.rows);
    /** the status line, when there is one */
    this.status = new Uint16Array(this.cols);
    /** where the next glyph goes */
    this.cursor = {col: 0, row: 0};
    /** whether the cursor is shown at all */
    this.cursorEnabled = c.cursor !== null;
    /** bumped by every change; a painter compares it with the one it painted */
    this.version = 0;
    this.status.fill(this.blank);
    this.clear();
  } // constructor

  // ------------------------------------------------------------------ reading

  /**
   * The glyph in a cell.
   * @param {number} col - 0 to cols-1.
   * @param {number} row - 0 to rows-1.
   * @returns {number} The glyph index; the blank one outside the screen.
   */
  glyphAt(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
      return this.blank;
    }
    return this.cells[row*this.cols+col];
  } // glyphAt

  /**
   * One row as text, through a decoder of glyphs.
   * @param {number} row - 0 to rows-1.
   * @param {Object} charset - Anything with `decodeGlyph(glyph)`: {@link TerminalCharset}.
   * @returns {string} `cols` characters.
   */
  rowText(row, charset) {
    var text = '';
    for (var col = 0; col < this.cols; col++) {
      text += charset.decodeGlyph(this.glyphAt(col, row));
    }
    return text;
  } // rowText

  /**
   * The state a match tool compares: every cell, the cursor, the status line.
   * @returns {Object} `{cols, rows, cells: Array, cursor: {col, row, enabled}, status: Array|null}`.
   */
  snapshot() {
    return {
      cols: this.cols,
      rows: this.rows,
      cells: Array.from(this.cells),
      cursor: {col: this.cursor.col, row: this.cursor.row, enabled: this.cursorEnabled},
      status: this.statusLine ? Array.from(this.status) : null
    };
  } // snapshot

  // ------------------------------------------------------------------ writing

  /**
   * Writes a glyph into a cell without moving the cursor.
   * @param {number} col - 0 to cols-1.
   * @param {number} row - 0 to rows-1.
   * @param {number} glyph - The glyph index.
   * @returns {boolean} True when the cell was on the screen.
   */
  putGlyph(col, row, glyph) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
      return false;
    }
    this.cells[row*this.cols+col] = glyph;
    this.version++;
    return true;
  } // putGlyph

  /**
   * Writes a glyph into the status line.
   * @param {number} col - 0 to cols-1.
   * @param {number} glyph - The glyph index.
   * @returns {boolean} True when there is a status line and the column is on it.
   */
  putStatus(col, glyph) {
    if (!this.statusLine || col < 0 || col >= this.cols) {
      return false;
    }
    this.status[col] = glyph;
    this.version++;
    return true;
  } // putStatus

  /**
   * Blanks the whole text area and homes the cursor.
   * @returns {TerminalScreen} This.
   */
  clear() {
    this.cells.fill(this.blank);
    this.cursor.col = 0;
    this.cursor.row = 0;
    this.version++;
    return this;
  } // clear

  /**
   * Blanks from the cursor to the end of the screen, cursor cell included —
   * VT52 `ESC J`.
   * @returns {TerminalScreen} This.
   */
  clearToEndOfScreen() {
    this.cells.fill(this.blank, this.cursor.row*this.cols+this.cursor.col);
    this.version++;
    return this;
  } // clearToEndOfScreen

  /**
   * Blanks from the cursor to the end of its row — VT52 `ESC K`.
   * @returns {TerminalScreen} This.
   */
  clearToEndOfLine() {
    var at = this.cursor.row*this.cols;
    this.cells.fill(this.blank, at+this.cursor.col, at+this.cols);
    this.version++;
    return this;
  } // clearToEndOfLine

  /**
   * Moves the text up, blank rows coming in at the bottom.
   * @param {number} [lines] - How many rows, 1 by default.
   * @returns {TerminalScreen} This.
   */
  scrollUp(lines) {
    var count = Math.max(0, Math.min(this.rows, lines === undefined ? 1 : lines));
    this.cells.copyWithin(0, count*this.cols);
    this.cells.fill(this.blank, (this.rows-count)*this.cols);
    this.version++;
    return this;
  } // scrollUp

  /**
   * Moves the text down, blank rows coming in at the top — VT52 `ESC I` on
   * the first row.
   * @param {number} [lines] - How many rows, 1 by default.
   * @returns {TerminalScreen} This.
   */
  scrollDown(lines) {
    var count = Math.max(0, Math.min(this.rows, lines === undefined ? 1 : lines));
    this.cells.copyWithin(count*this.cols, 0, (this.rows-count)*this.cols);
    this.cells.fill(this.blank, 0, count*this.cols);
    this.version++;
    return this;
  } // scrollDown

  /**
   * Moves the cursor, kept on the screen.
   * @param {number} col - The column.
   * @param {number} row - The row.
   * @returns {TerminalScreen} This.
   */
  setCursor(col, row) {
    this.cursor.col = Math.max(0, Math.min(this.cols-1, col));
    this.cursor.row = Math.max(0, Math.min(this.rows-1, row));
    this.version++;
    return this;
  } // setCursor

  /**
   * Shows or hides the cursor.
   * @param {boolean} enabled - Whether it is drawn.
   * @returns {TerminalScreen} This.
   */
  showCursor(enabled) {
    this.cursorEnabled = !!enabled && this.cursorShape !== null;
    this.version++;
    return this;
  } // showCursor

  // ------------------------------------------------------------ to the screen

  /**
   * The picture width for a font.
   * @param {TerminalFont} font - The font.
   * @returns {number} cols times the cell width.
   */
  frameWidth(font) {
    return this.cols*font.cellWidth;
  } // frameWidth

  /**
   * The picture height for a font.
   * @param {TerminalFont} font - The font.
   * @returns {number} The rows (and the status line) times the cell height.
   */
  frameHeight(font) {
    return (this.rows+(this.statusLine ? 1 : 0))*font.cellHeight;
  } // frameHeight

  /**
   * Packs a '#rrggbb' colour into a `Uint32Array` element.
   * @param {string} color - '#rrggbb'.
   * @param {boolean} littleEndian - The byte order of the target.
   * @returns {number} The packed opaque pixel.
   */
  static pack(color, littleEndian) {
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);
    return (littleEndian
      ? (255 << 24) | (b << 16) | (g << 8) | r
      : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
  } // pack

  /**
   * Paints the screen into a buffer of packed pixels, `frameWidth × frameHeight`:
   * every cell its glyph placed in the cell, the status line above or below the
   * text, and the cursor as a bar over the configured rows of its cell.
   * @param {Uint32Array} pixels - The target.
   * @param {TerminalFont} font - The glyphs.
   * @param {Object} options - `foreground` and `background` as packed pixels
   *        ({@link TerminalScreen.pack}); `cursorPhase`: true while a blinking
   *        cursor is lit (true by default).
   * @returns {TerminalScreen} This.
   */
  paint32(pixels, font, options) {
    var fg = options.foreground;
    var bg = options.background;
    var cursorPhase = options.cursorPhase === undefined ? true : !!options.cursorPhase;
    var width = this.frameWidth(font);
    var cw = font.cellWidth;
    var ch = font.cellHeight;
    var gw = font.glyphWidth;
    var textTop = this.statusLine === 'top' ? 1 : 0;

    pixels.fill(bg, 0, width*this.frameHeight(font));
    var paintRow = (glyphs, from, screenRow) => {
      for (var col = 0; col < this.cols; col++) {
        var glyph = glyphs[from+col];
        var base = (screenRow*ch+font.glyphY)*width+col*cw+font.glyphX;
        for (var line = 0; line < font.glyphHeight; line++) {
          var mask = font.glyphRow(glyph, line);
          if (mask === 0) {
            continue;
          }
          var offset = base+line*width;
          for (var bit = 0; bit < gw; bit++) {
            if (mask & (1 << (gw-1-bit))) {
              pixels[offset+bit] = fg;
            }
          }
        }
      }
    };
    for (var row = 0; row < this.rows; row++) {
      paintRow(this.cells, row*this.cols, row+textTop);
    }
    if (this.statusLine) {
      paintRow(this.status, 0, this.statusLine === 'top' ? 0 : this.rows);
    }

    if (this.cursorEnabled && cursorPhase) {
      var shape = this.cursorShape;
      var lines = shape.lines || [ch-1, ch-1];
      var x0 = this.cursor.col*cw+(shape.x === undefined ? font.glyphX : shape.x);
      var w = shape.width === undefined ? gw : shape.width;
      var y0 = (this.cursor.row+textTop)*ch;
      for (var y = lines[0]; y <= lines[1]; y++) {
        pixels.fill(fg, (y0+y)*width+x0, (y0+y)*width+x0+w);
      }
    }
    return this;
  } // paint32

  /**
   * The same painting into RGBA bytes — for a tool under Node that wants a
   * PNG of the screen.
   * @param {Uint8ClampedArray|Uint8Array} rgba - The target, frameWidth*frameHeight*4 bytes.
   * @param {TerminalFont} font - The glyphs.
   * @param {Object} options - As for paint32, but `foreground` and `background` as '#rrggbb'.
   * @returns {TerminalScreen} This.
   */
  paint(rgba, font, options) {
    var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    var view = new Uint32Array(rgba.buffer, rgba.byteOffset, this.frameWidth(font)*this.frameHeight(font));
    return this.paint32(view, font, Object.assign({}, options, {
      foreground: TerminalScreen.pack(options.foreground, littleEndian),
      background: TerminalScreen.pack(options.background, littleEndian)
    }));
  } // paint

} // TerminalScreen
