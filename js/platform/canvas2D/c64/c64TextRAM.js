const { C64Color } = await import('./c64Color.js?ver='+window.srcVersion);
const { C64ScreenCodes } = await import('./c64ScreenCodes.js?ver='+window.srcVersion);
// begin code

/**
 * The text screen of the Commodore 64 as the VIC-II sees it: 40 columns by
 * 25 rows of **screen codes** in the screen RAM at $0400 (1000 bytes), the
 * **colour RAM** at $D800 with the foreground colour of each cell (1000
 * nibbles), and the two registers that colour everything else — the
 * **background** $D021, one colour under every cell, and the choice of
 * character set (bit 1 of $D018). There is no attribute byte: a cell has its
 * own ink and shares the paper with the whole screen. This is the standard
 * (hires) text mode the machine boots in and BASIC prints to.
 *
 * **Multicolour text mode** ($D016 bit 4) is here too, because it is the mode
 * most games run in: a cell whose colour has bit 3 set is drawn two pixels to
 * the bit pair, `00` the background $D021, `01` the shared $D022, `10` the
 * shared $D023 and `11` the cell's own colour (its low three bits); a cell
 * whose colour is 0-7 stays hires even while the mode is on. The extended
 * background mode and the bitmap modes are not modelled.
 *
 * **Raster splits** are here too, because a game that wants more than 256
 * characters on the screen changes $D018 while the beam runs: {@link
 * C64TextRAM#setSplits} takes the changes as **data** — from which pixel
 * line on, which character set and which background colours — the way
 * `setDLI()` does it on the Atari. Impossible Mission draws its room with
 * one set and the pocket computer below it with another, and the colours
 * change with them.
 *
 * **Fine horizontal scroll and the 38-column window** ($D016 bits 0-2 and 3)
 * are here as well, for the whole screen ({@link C64TextRAM#setScrollX},
 * {@link C64TextRAM#setColumns}) and per split: a scrolling game moves the
 * playfield by pixels and keeps the panel still, and the chip shows it
 * because a raster interrupt rewrites $D016 between them. In 38 columns the
 * border ({@link C64TextRAM#setBorder}, $D020) covers 7 pixels on the left
 * and 9 on the right, over the sprites too, so it is painted last. A split
 * may also start **inside a line** (`fromX`): the chip takes a new $D018 or
 * $D016 at once, and R-Type writes them while the beam is in the picture.
 *
 * The KERNAL's screen editor is here as well, as far as a boot screen and a
 * game's messages need it: `print()` advances a cursor, wraps at column 40,
 * scrolls at the bottom and writes in the current colour, `RVS ON` sets the
 * reverse bit, and the cursor is the character under it shown inverted
 * while its blink phase is on.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas. The glyphs come from any object
 * with `glyphBytes(code, set)` — {@link C64Fonts8x8} has the ROM, a game can
 * hand over a character set of its own — and the picture goes into a buffer of
 * packed pixels, so a tool under Node can paint the screen the way the browser
 * does (R-001). The entity owning a canvas is {@link C64TextModeEntity}.
 *
 * ```js
 * var text = new C64TextRAM();
 * text.clear();
 * text.print('\n    **** COMMODORE 64 BASIC V2 ****\n\nREADY.\n');
 * text.printAt(0, 24, 'SCORE 000100', C64Color.index('white'));
 * ```
 */
export class C64TextRAM {

  /** where the screen RAM and the colour RAM are */
  static get SCREEN_BASE() { return 0x0400; }
  static get COLOR_BASE() { return 0xD800; }
  /** the screen in cells */
  static get COLS() { return 40; }
  static get ROWS() { return 25; }
  static get CELLS() { return 1000; }
  /** a cell in pixels */
  static get CELL() { return 8; }
  /** the picture in pixels */
  static get WIDTH() { return 320; }
  static get HEIGHT() { return 200; }
  /** the screen code of a space */
  static get SPACE() { return 0x20; }
  /** light blue on blue: what the machine boots with */
  static get DEFAULT_COLOR() { return 14; }
  static get DEFAULT_BACKGROUND() { return 6; }

  /**
   * @param {Uint8Array} [screen] - Initial screen codes, 1000 bytes; blank otherwise.
   * @param {Uint8Array} [colors] - Initial colour RAM, 1000 bytes; the default colour otherwise.
   */
  constructor(screen, colors) {
    this.id = 'C64TextRAM';

    /** the screen codes, row by row */
    this.screen = new Uint8Array(C64TextRAM.CELLS);
    /** the colour of each cell, low nibble */
    this.colorRAM = new Uint8Array(C64TextRAM.CELLS);
    /** $D021: the colour under every cell */
    this.background = C64TextRAM.DEFAULT_BACKGROUND;
    /** $D016 bit 4: multicolour text mode */
    this.multicolor = false;
    /** $D022: the `01` colour of multicolour cells */
    this.background1 = 0;
    /** $D023: the `10` colour of multicolour cells */
    this.background2 = 0;
    /** raster splits: `[{fromLine, fromX, font, background, background1, background2, scrollX, columns, border}]` */
    this.splits = null;
    /** $D016 bits 0-2: the fine horizontal scroll, 0-7 pixels to the right */
    this.scrollX = 0;
    /** $D016 bit 3: 40 columns, or 38 with the border over the edges */
    this.columns = 40;
    /** $D020: the border, seen here only where the 38-column window covers the picture */
    this.border = 14;
    /** glyph rows by font for one painting by the line painter (a split may switch fonts every line) */
    this.glyphCache = new Map();
    /** which character set the VIC-II reads: 0 uppercase/graphics, 1 lowercase/uppercase */
    this.charset = 0;
    /** the colour `print()` writes in when given none — the cursor colour */
    this.color = C64TextRAM.DEFAULT_COLOR;
    /** RVS ON: `print()` sets bit 7 of every code */
    this.reverse = false;
    /** where the next character goes */
    this.cursor = {col: 0, row: 0};
    /** whether the cursor is shown at all (a running program hides it) */
    this.cursorEnabled = true;
    /** bumped by every write; a painter compares it with the one it painted */
    this.version = 0;
    /** glyph rows by set and code, filled on the first paint of each */
    this.glyphs = [new Array(256), new Array(256)];
    /** the font the glyphs were taken from, to drop them when it changes */
    this.glyphsFont = null;

    if (screen) {
      this.screen.set(screen.subarray(0, C64TextRAM.CELLS));
      if (colors) {
        this.colorRAM.set(colors.subarray(0, C64TextRAM.CELLS));
      } else {
        this.colorRAM.fill(this.color);
      }
    } else {
      this.clear();
    }
  } // constructor

  // ------------------------------------------------------------- addressing

  /**
   * The offset of a cell in either memory.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @returns {number} row*40+col.
   */
  static offsetOf(col, row) {
    return row*C64TextRAM.COLS+col;
  } // offsetOf

  // ------------------------------------------------------------------ reading

  /**
   * The screen code in a cell.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @returns {number} The code, reverse bit included.
   */
  charAt(col, row) {
    return this.screen[C64TextRAM.offsetOf(col, row)];
  } // charAt

  /**
   * The colour of a cell.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @returns {number} 0-15.
   */
  colorAt(col, row) {
    return this.colorRAM[C64TextRAM.offsetOf(col, row)] & 15;
  } // colorAt

  /**
   * One row as a string, in the current character set, reverse video
   * dropped — what a test reads back.
   * @param {number} row - 0-24.
   * @returns {string} 40 characters.
   */
  rowText(row) {
    var text = '';
    for (var col = 0; col < C64TextRAM.COLS; col++) {
      text += C64ScreenCodes.decodeChar(this.charAt(col, row), this.charset);
    }
    return text;
  } // rowText

  // ---------------------------------------------------------------- registers

  /**
   * Sets $D021, the colour under every cell.
   * @param {number} color - 0-15.
   * @returns {C64TextRAM} This.
   */
  setBackground(color) {
    this.background = color & 15;
    this.version++;
    return this;
  } // setBackground

  /**
   * Turns multicolour text mode on or off — $D016 bit 4.
   * @param {boolean} on - Whether cells with colour 8-15 are multicoloured.
   * @returns {C64TextRAM} This.
   */
  setMulticolor(on) {
    this.multicolor = !!on;
    this.version++;
    return this;
  } // setMulticolor

  /**
   * Sets the two colours multicolour cells share, $D022 and $D023.
   * @param {number} one - $D022, the `01` bit pair, 0-15.
   * @param {number} two - $D023, the `10` bit pair, 0-15.
   * @returns {C64TextRAM} This.
   */
  setSharedColors(one, two) {
    this.background1 = one & 15;
    this.background2 = two & 15;
    this.version++;
    return this;
  } // setSharedColors

  /**
   * Sets the fine horizontal scroll, $D016 bits 0-2: the picture moves 0-7
   * pixels to the right and the background fills what it uncovers.
   * @param {number} x - 0-7.
   * @returns {C64TextRAM} This.
   */
  setScrollX(x) {
    this.scrollX = x & 7;
    this.version++;
    return this;
  } // setScrollX

  /**
   * Chooses the window width, $D016 bit 3.
   * @param {number} columns - 40, or 38: the border then covers 7 pixels on
   *        the left and 9 on the right.
   * @returns {C64TextRAM} This.
   */
  setColumns(columns) {
    this.columns = columns === 38 ? 38 : 40;
    this.version++;
    return this;
  } // setColumns

  /**
   * Sets $D020, which shows here only where the 38-column window covers the
   * picture.
   * @param {number} color - 0-15.
   * @returns {C64TextRAM} This.
   */
  setBorder(color) {
    this.border = color & 15;
    this.version++;
    return this;
  } // setBorder

  /**
   * The register changes a raster interrupt makes while the picture is
   * drawn, as data. Each entry says **from which pixel line** it holds and
   * what changes; what an entry leaves out stays as it was.
   *
   * ```js
   * text.setSplits([
   *   {fromLine: 0,   font: roomSet,     background: 12, background1: 2,  background2: 10},
   *   {fromLine: 120, font: computerSet, background: 0,  background1: 14, background2: 6}
   * ]);
   * ```
   *
   * An entry may also set `scrollX`, `columns` and `border`, and start
   * inside its line with `fromX` (0-319): the change holds from that pixel
   * of `fromLine` on, and from the start of every line below it.
   *
   * @param {Array<Object>|null} splits - Entries with `fromLine` 0-199 and
   *        any of `font`, `background`, `background1`, `background2`,
   *        `scrollX`, `columns`, `border`, `fromX`; null goes back to one set
   *        of registers for the whole screen.
   * @returns {C64TextRAM} This.
   */
  setSplits(splits) {
    this.splits = splits && splits.length
      ? splits.slice().sort(function (a, b) {
          return ((a.fromLine || 0)-(b.fromLine || 0)) || ((a.fromX || 0)-(b.fromX || 0));
        })
      : null;
    this.version++;
    return this;
  } // setSplits

  /**
   * The split that holds on a pixel line, with the registers of this memory
   * filled in for whatever it does not say.
   * @param {number} line - 0-199.
   * @returns {Object} `{font, background, background1, background2}`.
   */
  splitAt(line, x) {
    var at = x || 0;
    var state = {font: null, background: this.background,
                 background1: this.background1, background2: this.background2,
                 scrollX: this.scrollX, columns: this.columns, border: this.border};
    if (!this.splits) {
      return state;
    }
    for (var i = 0; i < this.splits.length; i++) {
      var split = this.splits[i];
      var from = split.fromLine || 0;
      if (from > line || (from === line && (split.fromX || 0) > at)) {
        break;
      }
      C64TextRAM.applySplit(state, split);
    }
    return state;
  } // splitAt

  /**
   * What one split changes, onto a state.
   * @private
   */
  static applySplit(state, split) {
    if (split.font !== undefined) state.font = split.font;
    if (split.background !== undefined) state.background = split.background & 15;
    if (split.background1 !== undefined) state.background1 = split.background1 & 15;
    if (split.background2 !== undefined) state.background2 = split.background2 & 15;
    if (split.scrollX !== undefined) state.scrollX = split.scrollX & 7;
    if (split.columns !== undefined) state.columns = split.columns === 38 ? 38 : 40;
    if (split.border !== undefined) state.border = split.border & 15;
  } // applySplit

  /**
   * Whether the picture needs the line painter: a scroll, 38 columns or a
   * split that starts inside a line or changes either.
   * @private
   */
  needsLinePainter() {
    if (this.scrollX || this.columns !== 40) {
      return true;
    }
    if (!this.splits) {
      return false;
    }
    return this.splits.some(function (split) {
      return split.fromX || split.scrollX || (split.columns !== undefined && split.columns !== 40);
    });
  } // needsLinePainter

  /**
   * The states of one pixel line: `[{x, state}]`, the first at x 0, then
   * one for every split that starts inside the line.
   * @private
   */
  segmentsOf(line) {
    var segments = [{x: 0, state: this.splitAt(line, 0)}];
    if (this.splits) {
      for (var i = 0; i < this.splits.length; i++) {
        var split = this.splits[i];
        if ((split.fromLine || 0) === line && split.fromX > 0 && split.fromX < C64TextRAM.WIDTH) {
          var state = Object.assign({}, segments[segments.length-1].state);
          C64TextRAM.applySplit(state, split);
          if (segments[segments.length-1].x === split.fromX) {
            segments[segments.length-1].state = state;
          } else {
            segments.push({x: split.fromX, state: state});
          }
        }
      }
    }
    return segments;
  } // segmentsOf

  /**
   * Chooses the character set the screen is shown in.
   * @param {number} set - 0 uppercase/graphics, 1 lowercase/uppercase.
   * @returns {C64TextRAM} This.
   */
  setCharset(set) {
    this.charset = set === 1 ? 1 : 0;
    this.version++;
    return this;
  } // setCharset

  /**
   * Sets the colour `print()` writes in.
   * @param {number} color - 0-15.
   * @returns {C64TextRAM} This.
   */
  setColor(color) {
    this.color = color & 15;
    return this;
  } // setColor

  /**
   * RVS ON / RVS OFF for what `print()` writes next.
   * @param {boolean} on - Whether to write in reverse video.
   * @returns {C64TextRAM} This.
   */
  setReverse(on) {
    this.reverse = !!on;
    return this;
  } // setReverse

  // ------------------------------------------------------------------ writing

  /**
   * Fills the screen with spaces, the colour RAM with a colour, and homes
   * the cursor — what CLR/HOME does (the KERNAL fills the colour RAM with
   * the current colour). RVS goes off as well.
   * @param {number} [color] - The colour; the current one by default.
   * @returns {C64TextRAM} This.
   */
  clear(color) {
    if (color !== undefined) {
      this.color = color & 15;
    }
    this.screen.fill(C64TextRAM.SPACE);
    this.colorRAM.fill(this.color);
    this.reverse = false;
    this.cursor.col = 0;
    this.cursor.row = 0;
    this.version++;
    return this;
  } // clear

  /**
   * Writes one cell without moving the cursor.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @param {number} code - The screen code, reverse bit included.
   * @param {number} [color] - The colour; the cell keeps its own without it.
   * @returns {boolean} True when the cell was on the screen.
   */
  putChar(col, row, code, color) {
    if (col < 0 || row < 0 || col >= C64TextRAM.COLS || row >= C64TextRAM.ROWS) {
      return false;
    }
    var at = C64TextRAM.offsetOf(col, row);
    this.screen[at] = code & 0xFF;
    if (color !== undefined) {
      this.colorRAM[at] = color & 15;
    }
    this.version++;
    return true;
  } // putChar

  /**
   * Writes a string at a position without moving the cursor — a label, a
   * score. Nothing wraps or scrolls; what runs off the row is dropped.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @param {string} text - The text, encoded to screen codes of the current set.
   * @param {number} [color] - The colour; the cells keep their own without it.
   * @param {boolean} [reverse] - Whether to write in reverse video.
   * @returns {C64TextRAM} This.
   */
  printAt(col, row, text, color, reverse) {
    var codes = C64ScreenCodes.encode(text, this.charset);
    var bit = reverse ? C64ScreenCodes.REVERSE : 0;
    for (var i = 0; i < codes.length; i++) {
      this.putChar(col+i, row, codes[i] | bit, color);
    }
    return this;
  } // printAt

  /**
   * Moves the cursor.
   * @param {number} col - 0-39.
   * @param {number} row - 0-24.
   * @returns {C64TextRAM} This.
   */
  setCursor(col, row) {
    this.cursor.col = Math.max(0, Math.min(C64TextRAM.COLS-1, col));
    this.cursor.row = Math.max(0, Math.min(C64TextRAM.ROWS-1, row));
    this.version++;
    return this;
  } // setCursor

  /**
   * Shows or hides the cursor.
   * @param {boolean} enabled - Whether the cursor is drawn.
   * @returns {C64TextRAM} This.
   */
  showCursor(enabled) {
    this.cursorEnabled = !!enabled;
    this.version++;
    return this;
  } // showCursor

  /**
   * Writes text at the cursor the way the KERNAL's CHROUT does: the cursor
   * advances, a line wraps at column 40, `\n` starts a new line, `\r`
   * returns to column 0, `\b` steps back, and writing past the last row
   * scrolls the screen up. Every character goes in the current colour, with
   * the reverse bit while RVS is on.
   * @param {string} text - The text, encoded to screen codes of the current set.
   * @param {number} [color] - The colour for this and later text.
   * @returns {C64TextRAM} This.
   */
  print(text, color) {
    if (color !== undefined) {
      this.color = color & 15;
    }
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      switch (ch) {
        case '\n':
          this.newLine();
          break;
        case '\r':
          this.cursor.col = 0;
          break;
        case '\b':
          if (this.cursor.col > 0) {
            this.cursor.col--;
          }
          break;
        default:
          var at = C64TextRAM.offsetOf(this.cursor.col, this.cursor.row);
          this.screen[at] = C64ScreenCodes.encodeChar(ch, this.charset) | (this.reverse ? C64ScreenCodes.REVERSE : 0);
          this.colorRAM[at] = this.color;
          this.cursor.col++;
          if (this.cursor.col >= C64TextRAM.COLS) {
            this.newLine();
          }
          break;
      }
    }
    this.version++;
    return this;
  } // print

  /**
   * Carriage return at the cursor, scrolling when the cursor is on the last
   * row. RVS goes off, as it does on the machine at the end of a line.
   * @returns {C64TextRAM} This.
   */
  newLine() {
    this.cursor.col = 0;
    this.reverse = false;
    if (this.cursor.row >= C64TextRAM.ROWS-1) {
      this.scrollUp(1);
    } else {
      this.cursor.row++;
    }
    this.version++;
    return this;
  } // newLine

  /**
   * Scrolls the screen up, blank rows in the current colour coming in at the
   * bottom. Both memories move.
   * @param {number} [lines] - How many rows, 1 by default.
   * @returns {C64TextRAM} This.
   */
  scrollUp(lines) {
    var count = Math.max(0, Math.min(C64TextRAM.ROWS, lines === undefined ? 1 : lines));
    var cells = count*C64TextRAM.COLS;
    this.screen.copyWithin(0, cells, C64TextRAM.CELLS);
    this.colorRAM.copyWithin(0, cells, C64TextRAM.CELLS);
    this.screen.fill(C64TextRAM.SPACE, C64TextRAM.CELLS-cells);
    this.colorRAM.fill(this.color, C64TextRAM.CELLS-cells);
    this.version++;
    return this;
  } // scrollUp

  // ------------------------------------------------------------ to the screen

  /**
   * The 16 colours as packed pixels, in the byte order of this machine's
   * `Uint32Array`.
   * @param {boolean} littleEndian - Whether to pack for a little-endian machine.
   * @returns {Uint32Array} 16 packed opaque pixels.
   */
  static lookup(littleEndian) {
    var key = littleEndian ? 'le' : 'be';
    if (!C64TextRAM.lookups[key]) {
      var table = new Uint32Array(16);
      for (var i = 0; i < 16; i++) {
        var hex = C64Color.color(i);
        var r = parseInt(hex.substring(1, 3), 16);
        var g = parseInt(hex.substring(3, 5), 16);
        var b = parseInt(hex.substring(5, 7), 16);
        table[i] = (littleEndian
          ? (255 << 24) | (b << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
      }
      C64TextRAM.lookups[key] = table;
    }
    return C64TextRAM.lookups[key];
  } // lookup

  /**
   * The eight rows of a code's glyph in the current set, asked of the font
   * once and kept.
   * @param {Object} font - Anything with `glyphBytes(code, set)` returning 8 row masks.
   * @param {number} code - The screen code, 0-255.
   * @returns {Uint8Array} 8 bytes, bit 7 the leftmost pixel.
   */
  glyph(font, code) {
    if (font !== this.glyphsFont) {
      this.glyphs = [new Array(256), new Array(256)];
      this.glyphsFont = font;
    }
    var set = this.glyphs[this.charset];
    if (!set[code]) {
      set[code] = font.glyphBytes(code, this.charset);
    }
    return set[code];
  } // glyph

  /**
   * Paints the screen into a buffer of packed pixels, 320 x 200, the way the
   * VIC-II does it in standard text mode: every set bit of a glyph is the
   * cell's colour, every clear bit the background; the cell under the cursor
   * is inverted while the cursor phase is on.
   * @param {Uint32Array} pixels - Target, 320*200 elements.
   * @param {Object} font - Anything with `glyphBytes(code, set)`; {@link C64Fonts8x8}.
   * @param {boolean} littleEndian - Byte order of the target.
   * @param {Object} [options] - `cursorPhase`: true while the cursor is
   *        visible (true by default); `cursor`: whether to draw the cursor at
   *        all (true by default, and only when it is enabled).
   * @returns {C64TextRAM} This.
   */
  paint32(pixels, font, littleEndian, options) {
    var opts = options || {};
    var cursorPhase = opts.cursorPhase === undefined ? true : !!opts.cursorPhase;
    var drawCursor = (opts.cursor === undefined ? true : !!opts.cursor) && this.cursorEnabled && cursorPhase;
    var colors = C64TextRAM.lookup(littleEndian);
    if (this.needsLinePainter()) {
      this.paintLines32(pixels, font, colors, drawCursor);
      if (opts.border !== false) {
        this.paintBorder32(pixels, littleEndian);
      }
      return this;
    }
    var multi = this.multicolor;
    // raster interrupt bands: for every pixel line its character set and colours
    var bands = null;
    if (this.splits) {
      bands = new Array(C64TextRAM.HEIGHT);
      for (var line = 0; line < C64TextRAM.HEIGHT; line++) {
        bands[line] = this.splitAt(line);
      }
    }
    var bg = colors[this.background & 15];
    var shared1 = colors[this.background1 & 15];
    var shared2 = colors[this.background2 & 15];
    var width = C64TextRAM.WIDTH;
    var cell = C64TextRAM.CELL;
    for (var row = 0; row < C64TextRAM.ROWS; row++) {
      for (var col = 0; col < C64TextRAM.COLS; col++) {
        var at = row*C64TextRAM.COLS+col;
        var code = this.screen[at];
        if (drawCursor && this.cursor.col === col && this.cursor.row === row) {
          code ^= C64ScreenCodes.REVERSE;
        }
        var ink = this.colorRAM[at] & 15;
        var base = row*cell*width+col*cell;
        if (bands) {
          // the set and colours may change even inside a cell, as on the chip
          this.paintCellBanded(pixels, font, colors, bands, row, col, code, ink, base, multi, width, cell);
          continue;
        }
        var rows = this.glyph(font, code);
        if (multi && (ink & 8)) {
          // multicolour: two pixels a bit pair, the cell's own colour is 11
          var own = colors[ink & 7];
          for (var mline = 0; mline < cell; mline++) {
            var mmask = rows[mline];
            var moffset = base+mline*width;
            for (var pair = 0; pair < 4; pair++) {
              var bits = (mmask >> (6-pair*2)) & 3;
              var pixel = bits === 0 ? bg : bits === 1 ? shared1 : bits === 2 ? shared2 : own;
              pixels[moffset+pair*2] = pixel;
              pixels[moffset+pair*2+1] = pixel;
            }
          }
        } else {
          var fg = colors[ink];
          for (var line = 0; line < cell; line++) {
            var mask = rows[line];
            var offset = base+line*width;
            for (var bit = 0; bit < 8; bit++) {
              pixels[offset+bit] = (mask & (0x80 >> bit)) ? fg : bg;
            }
          }
        }
      }
    }
    return this;
  } // paint32

  /**
   * The picture pixel line by pixel line, each line in the states of its
   * segments — for the fine scroll, the 38-column window and splits inside
   * a line. The border is not painted here ({@link C64TextRAM#paintBorder32}).
   * @private
   */
  paintLines32(pixels, font, colors, drawCursor) {
    var width = C64TextRAM.WIDTH;
    var cols = C64TextRAM.COLS;
    var multi = this.multicolor;
    var cursorAt = drawCursor ? C64TextRAM.offsetOf(this.cursor.col, this.cursor.row) : -1;
    // per frame only: a game animates glyphs in place (`C64Charset.setGlyph`)
    this.glyphCache = new Map();
    for (var line = 0; line < C64TextRAM.HEIGHT; line++) {
      var row = line >> 3;
      var cellLine = line & 7;
      var segments = this.segmentsOf(line);
      var offset = line*width;
      for (var s = 0; s < segments.length; s++) {
        var state = segments[s].state;
        var end = s+1 < segments.length ? segments[s+1].x : width;
        var glyphs = this.glyphsOf(state.font || font);
        var bg = colors[state.background];
        var one = colors[state.background1];
        var two = colors[state.background2];
        for (var x = segments[s].x; x < end; x++) {
          var source = x-state.scrollX;
          if (source < 0) {
            pixels[offset+x] = bg;
            continue;
          }
          var at = row*cols+(source >> 3);
          var code = this.screen[at];
          if (at === cursorAt) {
            code ^= C64ScreenCodes.REVERSE;
          }
          var glyph = glyphs[code] || (glyphs[code] = (state.font || font).glyphBytes(code, this.charset));
          var mask = glyph[cellLine];
          var bit = source & 7;
          var ink = this.colorRAM[at] & 15;
          if (multi && (ink & 8)) {
            var bits = (mask >> (6-(bit & 6))) & 3;
            pixels[offset+x] = bits === 0 ? bg : bits === 1 ? one : bits === 2 ? two : colors[ink & 7];
          } else {
            pixels[offset+x] = (mask & (0x80 >> bit)) ? colors[ink] : bg;
          }
        }
      }
    }
  } // paintLines32

  /**
   * The glyph rows of a font in the current character set, kept per font
   * for one painting.
   * @private
   */
  glyphsOf(font) {
    var key = this.charset;
    var byFont = this.glyphCache.get(font);
    if (!byFont) {
      byFont = [new Array(256), new Array(256)];
      this.glyphCache.set(font, byFont);
    }
    return byFont[key];
  } // glyphsOf

  /**
   * The border over the picture where the 38-column window covers it: 7
   * pixels on the left and 9 on the right of every line in 38 columns. It
   * goes last, over the sprites too, as the chip's border unit does.
   * @param {Uint32Array} pixels - The picture, 320*200.
   * @param {boolean} littleEndian - Byte order of the target.
   * @returns {C64TextRAM} This.
   */
  paintBorder32(pixels, littleEndian) {
    if (!this.needsLinePainter()) {
      return this;
    }
    var colors = C64TextRAM.lookup(littleEndian);
    var width = C64TextRAM.WIDTH;
    for (var line = 0; line < C64TextRAM.HEIGHT; line++) {
      var left = this.splitAt(line, 0);
      var right = this.splitAt(line, width-9);
      var offset = line*width;
      if (left.columns === 38) {
        for (var x = 0; x < 7; x++) pixels[offset+x] = colors[left.border];
      }
      if (right.columns === 38) {
        for (var r = width-9; r < width; r++) pixels[offset+r] = colors[right.border];
      }
    }
    return this;
  } // paintBorder32

  /**
   * One cell painted line by line, so that a raster split can change the
   * character set or the colours in the middle of it.
   * @private
   */
  paintCellBanded(pixels, font, colors, bands, row, col, code, ink, base, multi, width, cell) {
    for (var line = 0; line < cell; line++) {
      var pixelLine = row*cell+line;
      var band = bands[pixelLine] || bands[bands.length-1];
      var rows = this.glyph(band.font || font, code);
      var mask = rows[line];
      var offset = base+line*width;
      var bg = colors[band.background & 15];
      if (multi && (ink & 8)) {
        var own = colors[ink & 7];
        var one = colors[band.background1 & 15];
        var two = colors[band.background2 & 15];
        for (var pair = 0; pair < 4; pair++) {
          var bits = (mask >> (6-pair*2)) & 3;
          var pixel = bits === 0 ? bg : bits === 1 ? one : bits === 2 ? two : own;
          pixels[offset+pair*2] = pixel;
          pixels[offset+pair*2+1] = pixel;
        }
      } else {
        var fg = colors[ink];
        for (var bit = 0; bit < 8; bit++) {
          pixels[offset+bit] = (mask & (0x80 >> bit)) ? fg : bg;
        }
      }
    }
  } // paintCellBanded

  /**
   * The same painting into RGBA bytes — for a tool under Node that wants a
   * PNG of the screen.
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, 320*200*4 bytes.
   * @param {Object} font - Anything with `glyphBytes(code, set)`.
   * @param {Object} [options] - As for {@link C64TextRAM#paint32}.
   * @returns {C64TextRAM} This.
   */
  paint(rgba, font, options) {
    var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    var view = new Uint32Array(rgba.buffer, rgba.byteOffset, C64TextRAM.WIDTH*C64TextRAM.HEIGHT);
    return this.paint32(view, font, littleEndian, options);
  } // paint

} // C64TextRAM

/** the 16 colours as packed pixels, one table per byte order */
C64TextRAM.lookups = {};
