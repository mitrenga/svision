const { VGAPalette } = await import('./vgaPalette.js?ver='+window.srcVersion);
// begin code

/**
 * The video memory of a VGA card in text mode 3: 80 columns by 25 rows at
 * B800:0000, two bytes a cell — the character code first, its attribute
 * second, 4000 bytes in all. The character generator turns a code into an
 * 8x16 glyph, the attribute picks its colour from the 16 of the EGA: bits 0-3
 * the foreground, bits 4-6 the background, bit 7 blink.
 *
 * This is the screen every PC showed before a game switched to mode 13h: the
 * BIOS banner, the memory count, `Starting MS-DOS...`, the prompt and the
 * command typed at it. {@link DOSBootModel} writes into it; a game that prints
 * a message and returns to DOS writes into it again.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas. The glyphs come from any object
 * with `glyphBytes(codePoint)` — {@link VGAFonts8x16} has it — and the picture
 * goes into a buffer of pixels, so a tool under Node can render the boot
 * screen the same way the browser does (R-001). The entity owning a canvas is
 * {@link VGATextModeEntity}.
 *
 * ## Code page 437
 *
 * The bytes in the memory are code page 437, the character set of the IBM PC
 * — the box-drawing lines and the shaded blocks are single bytes there. Text
 * comes in as a JavaScript string and goes through {@link VGATextRAM.encode};
 * a character 437 does not have becomes `?`, the way a DOS program would have
 * shown it.
 *
 * ```js
 * var text = new VGATextRAM();
 * text.clear();
 * text.print('Starting MS-DOS...\n');
 * text.print('C:\\>', 0x07);
 * ```
 */
export class VGATextRAM {

  /** the linear address the memory starts at (segment B800) */
  static get BASE() { return 0xB8000; }
  /** the screen in cells */
  static get COLS() { return 80; }
  static get ROWS() { return 25; }
  /** a cell in pixels */
  static get CELL_WIDTH() { return 8; }
  static get CELL_HEIGHT() { return 16; }
  /** the picture in pixels */
  static get WIDTH() { return 640; }
  static get HEIGHT() { return 400; }
  /** the whole of it: two bytes a cell */
  static get BYTES() { return 4000; }
  /** light grey on black, the attribute DOS leaves everywhere after CLS */
  static get DEFAULT_ATTRIBUTE() { return 0x07; }
  /** the scan lines of the underline cursor the BIOS sets in mode 3 */
  static get CURSOR_TOP() { return 14; }
  static get CURSOR_BOTTOM() { return 15; }

  /**
   * @param {Uint8Array} [bytes] - Initial content, 4000 bytes; blank otherwise.
   */
  constructor(bytes) {
    this.id = 'VGATextRAM';

    /** the cells, character code then attribute */
    this.bytes = new Uint8Array(VGATextRAM.BYTES);
    /** where the next character goes */
    this.cursor = {col: 0, row: 0};
    /** the attribute `print()` uses when it is given none */
    this.attribute = VGATextRAM.DEFAULT_ATTRIBUTE;
    /** whether the cursor is shown at all (INT 10h can hide it) */
    this.cursorEnabled = true;
    /** bumped by every write; a painter compares it with the one it painted */
    this.version = 0;
    /** glyph rows by code, filled on the first paint of each */
    this.glyphs = new Array(256);
    if (bytes) {
      this.bytes.set(bytes.subarray(0, VGATextRAM.BYTES));
    } else {
      this.clear();
    }
  } // constructor

  // ------------------------------------------------------------- addressing

  /**
   * The offset of a cell from B800:0000.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @returns {number} (row*80+col)*2.
   */
  static offsetOf(col, row) {
    return (row*VGATextRAM.COLS+col)*2;
  } // offsetOf

  // ------------------------------------------------------------------ reading

  /**
   * The character code in a cell.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @returns {number} The code page 437 byte.
   */
  charAt(col, row) {
    return this.bytes[VGATextRAM.offsetOf(col, row)];
  } // charAt

  /**
   * The attribute of a cell.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @returns {number} The attribute byte.
   */
  attributeAt(col, row) {
    return this.bytes[VGATextRAM.offsetOf(col, row)+1];
  } // attributeAt

  /**
   * One row as a string — what a test reads back, and what a screen reader
   * would get.
   * @param {number} row - 0-24.
   * @returns {string} 80 characters.
   */
  rowText(row) {
    var text = '';
    for (var col = 0; col < VGATextRAM.COLS; col++) {
      text += VGATextRAM.decodeChar(this.charAt(col, row));
    }
    return text;
  } // rowText

  // ------------------------------------------------------------------ writing

  /**
   * Fills the screen with blanks in an attribute and homes the cursor — CLS.
   * @param {number} [attribute] - The attribute, light grey on black by default.
   * @returns {VGATextRAM} This, so calls can be chained.
   */
  clear(attribute) {
    var attr = attribute === undefined ? VGATextRAM.DEFAULT_ATTRIBUTE : attribute;
    for (var i = 0; i < VGATextRAM.BYTES; i += 2) {
      this.bytes[i] = 0x20;
      this.bytes[i+1] = attr;
    }
    this.attribute = attr;
    this.cursor.col = 0;
    this.cursor.row = 0;
    this.version++;
    return this;
  } // clear

  /**
   * Writes one cell without moving the cursor.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @param {number} code - The code page 437 byte.
   * @param {number} [attribute] - The attribute; the cell keeps its own without it.
   * @returns {boolean} True when the cell was on the screen.
   */
  putChar(col, row, code, attribute) {
    if (col < 0 || row < 0 || col >= VGATextRAM.COLS || row >= VGATextRAM.ROWS) {
      return false;
    }
    var at = VGATextRAM.offsetOf(col, row);
    this.bytes[at] = code & 0xFF;
    if (attribute !== undefined) {
      this.bytes[at+1] = attribute & 0xFF;
    }
    this.version++;
    return true;
  } // putChar

  /**
   * Writes a string at a position without moving the cursor — a label, a
   * status line. Nothing wraps or scrolls; what runs off the row is dropped.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @param {string} text - The text, encoded to code page 437 on the way.
   * @param {number} [attribute] - The attribute; the cells keep their own without it.
   * @returns {VGATextRAM} This.
   */
  printAt(col, row, text, attribute) {
    var codes = VGATextRAM.encode(text);
    for (var i = 0; i < codes.length; i++) {
      this.putChar(col+i, row, codes[i], attribute);
    }
    return this;
  } // printAt

  /**
   * Moves the cursor.
   * @param {number} col - 0-79.
   * @param {number} row - 0-24.
   * @returns {VGATextRAM} This.
   */
  setCursor(col, row) {
    this.cursor.col = Math.max(0, Math.min(VGATextRAM.COLS-1, col));
    this.cursor.row = Math.max(0, Math.min(VGATextRAM.ROWS-1, row));
    this.version++;
    return this;
  } // setCursor

  /**
   * Shows or hides the cursor.
   * @param {boolean} enabled - Whether the cursor is drawn.
   * @returns {VGATextRAM} This.
   */
  showCursor(enabled) {
    this.cursorEnabled = !!enabled;
    this.version++;
    return this;
  } // showCursor

  /**
   * Writes text at the cursor the way DOS's teletype output does: the cursor
   * advances, a line wraps at column 80, `\n` starts a new line, `\r` returns
   * to column 0, `\b` steps back, and writing past the last row scrolls the
   * screen up.
   * @param {string} text - The text, encoded to code page 437 on the way.
   * @param {number} [attribute] - The attribute for the new characters; the
   *        one of the last `print()` or `clear()` by default.
   * @returns {VGATextRAM} This.
   */
  print(text, attribute) {
    if (attribute !== undefined) {
      this.attribute = attribute & 0xFF;
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
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
          var at = VGATextRAM.offsetOf(this.cursor.col, this.cursor.row);
          this.bytes[at] = VGATextRAM.encodeChar(ch);
          this.bytes[at+1] = this.attribute;
          this.cursor.col++;
          if (this.cursor.col >= VGATextRAM.COLS) {
            this.newLine();
          }
          break;
      }
    }
    this.version++;
    return this;
  } // print

  /**
   * Carriage return and line feed at the cursor, scrolling when the cursor is
   * on the last row.
   * @returns {VGATextRAM} This.
   */
  newLine() {
    this.cursor.col = 0;
    if (this.cursor.row >= VGATextRAM.ROWS-1) {
      this.scrollUp(1);
    } else {
      this.cursor.row++;
    }
    this.version++;
    return this;
  } // newLine

  /**
   * Scrolls the screen up, blank rows in the current attribute coming in at the
   * bottom.
   * @param {number} [lines] - How many rows, 1 by default.
   * @returns {VGATextRAM} This.
   */
  scrollUp(lines) {
    var count = Math.max(0, Math.min(VGATextRAM.ROWS, lines === undefined ? 1 : lines));
    var rowBytes = VGATextRAM.COLS*2;
    this.bytes.copyWithin(0, count*rowBytes, VGATextRAM.BYTES);
    for (var i = (VGATextRAM.ROWS-count)*rowBytes; i < VGATextRAM.BYTES; i += 2) {
      this.bytes[i] = 0x20;
      this.bytes[i+1] = this.attribute;
    }
    this.version++;
    return this;
  } // scrollUp

  // ------------------------------------------------------------ to the screen

  /**
   * The 16 text mode colours as packed pixels, in the byte order of this
   * machine's `Uint32Array`.
   * @param {boolean} littleEndian - Whether to pack for a little-endian machine.
   * @returns {Uint32Array} 16 packed opaque pixels.
   */
  static lookup(littleEndian) {
    var key = littleEndian ? 'le' : 'be';
    if (!VGATextRAM.lookups[key]) {
      var table = new Uint32Array(16);
      VGAPalette.EGA.forEach((rgb, i) => {
        var r = VGAPalette.to8bit(rgb[0]);
        var g = VGAPalette.to8bit(rgb[1]);
        var b = VGAPalette.to8bit(rgb[2]);
        table[i] = (littleEndian
          ? (255 << 24) | (b << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
      });
      VGATextRAM.lookups[key] = table;
    }
    return VGATextRAM.lookups[key];
  } // lookup

  /**
   * The 16 rows of a character's glyph, asked of the font once and kept.
   * @param {Object} font - Anything with `glyphBytes(codePoint)` returning 16 row masks.
   * @param {number} code - The code page 437 byte.
   * @returns {Uint8Array} 16 bytes, bit 7 the leftmost pixel.
   */
  glyph(font, code) {
    if (!this.glyphs[code]) {
      var codePoint = VGATextRAM.CP437[code];
      this.glyphs[code] = font.glyphBytes(codePoint === 0 ? 0x20 : codePoint);
    }
    return this.glyphs[code];
  } // glyph

  /**
   * Paints the screen into a buffer of packed pixels, 640 x 400, the way the
   * character generator does it: every cell is its glyph in the foreground
   * colour on the background colour; a blinking cell shows its background
   * only while the blink phase is off; the cursor is two scan lines in the
   * foreground colour of its cell.
   * @param {Uint32Array} pixels - Target, 640*400 elements.
   * @param {Object} font - Anything with `glyphBytes(codePoint)`; {@link VGAFonts8x16}.
   * @param {boolean} littleEndian - Byte order of the target.
   * @param {Object} [options] - `blinkPhase`: true while blinking text is
   *        visible (true by default); `cursorPhase`: true while the cursor is
   *        visible (the blink phase by default — on the card the cursor blinks
   *        twice as fast as the text, every 16 frames against every 32);
   *        `cursor`: whether to draw the cursor at all (true by default, and
   *        only when it is enabled).
   * @returns {VGATextRAM} This.
   */
  paint32(pixels, font, littleEndian, options) {
    var opts = options || {};
    var blinkPhase = opts.blinkPhase === undefined ? true : !!opts.blinkPhase;
    var cursorPhase = opts.cursorPhase === undefined ? blinkPhase : !!opts.cursorPhase;
    var drawCursor = (opts.cursor === undefined ? true : !!opts.cursor) && this.cursorEnabled && cursorPhase;
    var colors = VGATextRAM.lookup(littleEndian);
    var width = VGATextRAM.WIDTH;
    var bytes = this.bytes;
    for (var row = 0; row < VGATextRAM.ROWS; row++) {
      for (var col = 0; col < VGATextRAM.COLS; col++) {
        var at = (row*VGATextRAM.COLS+col)*2;
        var attr = bytes[at+1];
        var fg = colors[attr & 0x0F];
        var bg = colors[(attr >> 4) & 0x07];
        if ((attr & 0x80) && !blinkPhase) {
          fg = bg;
        }
        var rows = this.glyph(font, bytes[at]);
        var isCursor = drawCursor && this.cursor.col === col && this.cursor.row === row;
        var base = row*VGATextRAM.CELL_HEIGHT*width+col*VGATextRAM.CELL_WIDTH;
        for (var line = 0; line < VGATextRAM.CELL_HEIGHT; line++) {
          var mask = rows[line];
          var offset = base+line*width;
          if (isCursor && line >= VGATextRAM.CURSOR_TOP && line <= VGATextRAM.CURSOR_BOTTOM) {
            mask = 0xFF;
          }
          for (var bit = 0; bit < 8; bit++) {
            pixels[offset+bit] = (mask & (0x80 >> bit)) ? fg : bg;
          }
        }
      }
    }
    return this;
  } // paint32

  /**
   * The same painting into RGBA bytes — for a tool under Node that wants a
   * PNG of the boot screen.
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, 640*400*4 bytes.
   * @param {Object} font - Anything with `glyphBytes(codePoint)`.
   * @param {Object} [options] - As for {@link VGATextRAM#paint32}.
   * @returns {VGATextRAM} This.
   */
  paint(rgba, font, options) {
    var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    var view = new Uint32Array(rgba.buffer, rgba.byteOffset, VGATextRAM.WIDTH*VGATextRAM.HEIGHT);
    return this.paint32(view, font, littleEndian, options);
  } // paint

  // ---------------------------------------------------------- code page 437

  /**
   * Encodes one character to code page 437; `?` for one the page lacks.
   * @param {string} ch - One character.
   * @returns {number} The byte.
   */
  static encodeChar(ch) {
    var code = VGATextRAM.reverse437()[ch.codePointAt(0)];
    return code === undefined ? 0x3F : code;
  } // encodeChar

  /**
   * Encodes a string to code page 437 bytes.
   * @param {string} text - The text.
   * @returns {Uint8Array} One byte per character.
   */
  static encode(text) {
    var codes = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) {
      codes[i] = VGATextRAM.encodeChar(text.charAt(i));
    }
    return codes;
  } // encode

  /**
   * Decodes one code page 437 byte to its character.
   * @param {number} code - The byte.
   * @returns {string} One character; a space for 0.
   */
  static decodeChar(code) {
    var codePoint = VGATextRAM.CP437[code & 0xFF];
    return String.fromCodePoint(codePoint === 0 ? 0x20 : codePoint);
  } // decodeChar

  /**
   * Unicode code point → code page 437 byte, built once from the table.
   * @returns {Object} The map.
   */
  static reverse437() {
    if (!VGATextRAM.reverseTable) {
      var map = {};
      // the low 32 and 127 map by their glyphs; ASCII proper takes precedence
      for (var i = 255; i >= 0; i--) {
        map[VGATextRAM.CP437[i]] = i;
      }
      map[0x20] = 0x20;
      VGATextRAM.reverseTable = map;
    }
    return VGATextRAM.reverseTable;
  } // reverse437

} // VGATextRAM

/** the 16 colours as packed pixels, one table per byte order */
VGATextRAM.lookups = {};
VGATextRAM.reverseTable = null;

/**
 * Code page 437 → Unicode. The 32 control positions carry the glyphs the
 * character generator shows for them (a DOS program that writes byte 3 gets a
 * heart), except 0, which is blank.
 */
VGATextRAM.CP437 = [
  0x0000, 0x263A, 0x263B, 0x2665, 0x2666, 0x2663, 0x2660, 0x2022, 0x25D8, 0x25CB, 0x25D9, 0x2642, 0x2640, 0x266A, 0x266B, 0x263C,
  0x25BA, 0x25C4, 0x2195, 0x203C, 0x00B6, 0x00A7, 0x25AC, 0x21A8, 0x2191, 0x2193, 0x2192, 0x2190, 0x221F, 0x2194, 0x25B2, 0x25BC,
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
  0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
  0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
  0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
  0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
  0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x2302,
  0x00C7, 0x00FC, 0x00E9, 0x00E2, 0x00E4, 0x00E0, 0x00E5, 0x00E7, 0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x00EC, 0x00C4, 0x00C5,
  0x00C9, 0x00E6, 0x00C6, 0x00F4, 0x00F6, 0x00F2, 0x00FB, 0x00F9, 0x00FF, 0x00D6, 0x00DC, 0x00A2, 0x00A3, 0x00A5, 0x20A7, 0x0192,
  0x00E1, 0x00ED, 0x00F3, 0x00FA, 0x00F1, 0x00D1, 0x00AA, 0x00BA, 0x00BF, 0x2310, 0x00AC, 0x00BD, 0x00BC, 0x00A1, 0x00AB, 0x00BB,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556, 0x2555, 0x2563, 0x2551, 0x2557, 0x255D, 0x255C, 0x255B, 0x2510,
  0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x255E, 0x255F, 0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x2567,
  0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256B, 0x256A, 0x2518, 0x250C, 0x2588, 0x2584, 0x258C, 0x2590, 0x2580,
  0x03B1, 0x00DF, 0x0393, 0x03C0, 0x03A3, 0x03C3, 0x00B5, 0x03C4, 0x03A6, 0x0398, 0x03A9, 0x03B4, 0x221E, 0x03C6, 0x03B5, 0x2229,
  0x2261, 0x00B1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00F7, 0x2248, 0x00B0, 0x2219, 0x00B7, 0x221A, 0x207F, 0x00B2, 0x25A0, 0x00A0
];
