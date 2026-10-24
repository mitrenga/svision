const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
// begin code

/**
 * The video memory of a ZX Spectrum: 6912 bytes at $4000-$5AFF, addressed the
 * way the machine addresses them, and painted the way the ULA paints them.
 *
 * This is the **model of the machine**, not of any game. What a game puts into
 * the memory is the game's business; how the memory is laid out, how an address
 * is worked out from a pixel position and how a byte plus an attribute become
 * eight coloured pixels is the machine's, and belongs here.
 *
 * ## The layout
 *
 * ```
 *   $4000-$57FF   6144 B  bitmap, 8 pixels per byte, one bit per pixel
 *   $5800-$5AFF    768 B  attributes, one byte per 8x8 cell
 * ```
 *
 * The bitmap is **not** laid out line by line. The ULA interleaves it: the top
 * two bits of the line number pick one of three thirds of the screen, the
 * bottom three pick the pixel line inside a character row, and the three in
 * between pick the character row. That is what `lineOffset()` computes, and it
 * is why a sprite drawn with `INC L` wraps round to the left hand edge eight
 * pixels lower instead of running off the screen.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document`, a canvas or a worker API, so the very same
 * code runs in the browser and in an offline `match*` tool under Node (R-001).
 * The entity that owns a canvas and a cache is {@link ZXVideoRAMEntity}, kept
 * in a separate file for exactly that reason.
 *
 * ## Writing
 *
 * `poke()` takes the address in the machine's two halves and an optional
 * operation, because the games do not all write the same way: Sabre Wulf and
 * Underwurlde **XOR** their sprites in (which is also how they rub them out
 * again), Highway Encounter blits a mask with **AND** and the image with
 * **OR**, and text is written plainly.
 *
 * ```js
 * var vram = new ZXVideoRAM();
 * var at = ZXVideoRAM.addressOf(x, y);
 * vram.poke(at.h, at.l, byte, 'xor');
 * ```
 *
 * Anything outside $4000-$5AFF is silently dropped: on the real machine those
 * addresses are ROM, and writing to ROM does nothing.
 *
 * ## And one thing the machine has not got
 *
 * {@link ZXVideoRAM#enableInkPlane} adds an optional **ink plane**: a byte per
 * pixel remembering which ink lit it, so a remake can paint without attribute
 * clash while its video memory stays byte for byte the original's. It is off
 * by default and costs nothing off — see the ink plane section below for what
 * it is and why it is not a change to the model of the machine.
 */
export class ZXVideoRAM {

  /** the address the video memory starts at */
  static get BASE() { return 0x4000; }
  /** the whole of it: 6144 bytes of bitmap plus 768 of attributes */
  static get BYTES() { return 6912; }
  /** the bitmap, $4000-$57FF */
  static get BITMAP_BYTES() { return 0x1800; }
  /** where the attributes start, as an offset from BASE */
  static get ATTRIBUTES_OFFSET() { return 0x1800; }
  /** the attributes, $5800-$5AFF */
  static get ATTRIBUTES_BYTES() { return 0x300; }
  /** the screen in character cells */
  static get COLS() { return 32; }
  static get ROWS() { return 24; }
  /** and in pixels */
  static get WIDTH() { return 256; }
  static get HEIGHT() { return 192; }
  /** the side of a character cell */
  static get CELL() { return 8; }
  /** the attribute the ROM leaves everywhere after CLS: white paper, black ink */
  static get BLANK_ATTRIBUTE() { return 0x38; }

  /**
   * The 16 colours of the machine as RGB triples, taken from {@link ZXColor} so
   * that there is one set of colour values in the codebase and not one per game.
   * @returns {number[][]} 16 arrays of [r, g, b].
   */
  static get PALETTE() {
    if (!ZXVideoRAM.paletteRGB) {
      ZXVideoRAM.paletteRGB = ZXColor.colorsNames.map((name) => {
        var hex = ZXColor[name];
        return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16),
                parseInt(hex.substr(5, 2), 16)];
      });
    }
    return ZXVideoRAM.paletteRGB;
  } // PALETTE

  /**
   * @param {Uint8Array|ArrayBuffer|string} [bytes] - Initial content: 6912
   *        bytes, or a base64 block of them. Anything shorter is copied to the
   *        start and the rest stays zero.
   */
  constructor(bytes) {
    this.id = 'ZXVideoRAM';

    this.bytes = new Uint8Array(ZXVideoRAM.BYTES);
    /** the optional ink plane, one byte per pixel; null until asked for */
    this.inkPlane = null;
    /** the pen the ink plane is written with; 0 means "leave it to the cell" */
    this.pen = 0;
    if (bytes) {
      this.bytes.set(ZXVideoRAM.decode(bytes).subarray(0, ZXVideoRAM.BYTES));
    }
  } // constructor

  // ------------------------------------------------------------- addressing

  /**
   * The offset of a pixel line inside the bitmap, in the ULA's own interleaved
   * order: third, pixel line within the character row, character row.
   * @param {number} line - The pixel line, 0-191.
   * @returns {number} The offset of its first byte from BASE.
   */
  static lineOffset(line) {
    return ((line & 0xC0) << 5) | ((line & 0x07) << 8) | ((line & 0x38) << 2);
  } // lineOffset

  /**
   * The other way round: which pixel line a bitmap offset belongs to. The
   * ULA's interleaving is a permutation of bits, so undoing it is the same
   * shuffle backwards.
   * @param {number} offset - An offset into the bitmap, 0 to $17FF.
   * @returns {number} The pixel line, 0-191.
   */
  static lineOfOffset(offset) {
    return ((offset & 0x1800) >> 5) | ((offset & 0x0700) >> 8) | ((offset & 0x00E0) >> 2);
  } // lineOfOffset

  /**
   * The screen address of a pixel position, in the two halves the machine
   * keeps it in — H is the page and L the position within it, which is what
   * makes `INC L` wrap round to the left hand edge.
   * @param {number} x - Pixel column, 0-255 (taken modulo 256).
   * @param {number} y - Pixel line, 0-191 (taken modulo 256).
   * @returns {Object} {h, l} - The high and low halves of the address.
   */
  static addressOf(x, y) {
    x = x & 0xFF;
    y = y & 0xFF;
    return {
      l: ((x >> 3) & 0x1F) | ((y << 2) & 0xE0),
      h: (((y >> 3) & 0x18) | 0x40) | (y & 7)
    };
  } // addressOf

  /**
   * The address of the attribute byte covering a pixel position.
   * @param {number} x - Pixel column.
   * @param {number} y - Pixel line.
   * @returns {number} The full 16 bit address, $5800-$5AFF.
   */
  static attributeAddressOf(x, y) {
    return 0x5800+(((y & 0xFF) >> 3)*ZXVideoRAM.COLS)+(((x & 0xFF) >> 3) & 0x1F);
  } // attributeAddressOf

  /**
   * The address of the attribute byte of a character cell.
   * @param {number} row - Character row, 0-23.
   * @param {number} col - Character column, 0-31.
   * @returns {number} The full 16 bit address.
   */
  static attributeAddress(row, col) {
    return 0x5800+row*ZXVideoRAM.COLS+col;
  } // attributeAddress

  /**
   * Whether a machine address falls inside the video memory. Everything else
   * is ROM or program memory, and a write there does not reach the screen.
   * @param {number} address - The full 16 bit address.
   * @returns {boolean} True when the address is $4000-$5AFF.
   */
  static isVideoAddress(address) {
    var at = address-ZXVideoRAM.BASE;
    return at >= 0 && at < ZXVideoRAM.BYTES;
  } // isVideoAddress

  // ---------------------------------------------------------------- reading

  /**
   * Reads a byte at the machine's address, given in halves.
   * @param {number} h - The high half of the address.
   * @param {number} l - And the low half.
   * @returns {number} The byte, or 0 outside the video memory.
   */
  peek(h, l) {
    return this.peekAddress(((h & 0xFF) << 8) | (l & 0xFF));
  } // peek

  /**
   * Reads a byte at a full machine address.
   * @param {number} address - The full 16 bit address.
   * @returns {number} The byte, or 0 outside the video memory.
   */
  peekAddress(address) {
    var at = address-ZXVideoRAM.BASE;
    return (at >= 0 && at < ZXVideoRAM.BYTES) ? this.bytes[at] : 0;
  } // peekAddress

  /**
   * Reads a byte at an offset from BASE, without the address arithmetic.
   * @param {number} offset - 0 to 6911.
   * @returns {number} The byte, or 0 out of range.
   */
  peekOffset(offset) {
    return (offset >= 0 && offset < ZXVideoRAM.BYTES) ? this.bytes[offset] : 0;
  } // peekOffset

  /**
   * The attribute byte of a character cell.
   * @param {number} row - Character row, 0-23.
   * @param {number} col - Character column, 0-31.
   * @returns {number} The attribute byte, or 0 out of range.
   */
  peekAttribute(row, col) {
    return this.peekOffset(ZXVideoRAM.ATTRIBUTES_OFFSET+row*ZXVideoRAM.COLS+col);
  } // peekAttribute

  // ---------------------------------------------------------------- writing

  /**
   * Applies one of the machine's write operations to a byte already in memory.
   * @param {number} current - The byte that is there now.
   * @param {number} value - The byte being written.
   * @param {string} [extraOperation] - 'none' (a plain write, the default),
   *        'xor', 'and' or 'or'.
   * @returns {number} The byte to store.
   */
  static combine(current, value, extraOperation) {
    switch (extraOperation) {
      case 'xor': return (current ^ value) & 0xFF;
      case 'and': return current & value & 0xFF;
      case 'or': return (current | value) & 0xFF;
      default: return value & 0xFF;
    }
  } // combine

  /**
   * Writes a byte at the machine's address, given in halves — this is the call
   * a translated blitter makes, because the original keeps H and L apart and
   * steps them with `INC L` and `DEC H`.
   *
   * Anything outside $4000-$5AFF is dropped, the way a write to ROM is.
   * @param {number} h - The high half of the address.
   * @param {number} l - And the low half.
   * @param {number} value - The byte to write.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the byte reached the video memory.
   */
  poke(h, l, value, extraOperation) {
    return this.pokeAddress(((h & 0xFF) << 8) | (l & 0xFF), value, extraOperation);
  } // poke

  /**
   * Writes a byte at a full machine address.
   * @param {number} address - The full 16 bit address.
   * @param {number} value - The byte to write.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the byte reached the video memory.
   */
  pokeAddress(address, value, extraOperation) {
    return this.pokeOffset(address-ZXVideoRAM.BASE, value, extraOperation);
  } // pokeAddress

  /**
   * Writes a byte at an offset from BASE, without the address arithmetic.
   * A write into the bitmap also keeps the ink plane up to date when one is
   * on (enableInkPlane): markInk() gives the bits the write drew to the
   * current pen and takes the owner away from the bits it put out.
   * @param {number} offset - 0 to 6911.
   * @param {number} value - The byte to write.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the byte was inside the video memory.
   */
  pokeOffset(offset, value, extraOperation) {
    if (offset < 0 || offset >= ZXVideoRAM.BYTES) {
      return false;
    }
    var before = this.bytes[offset];
    var after = ZXVideoRAM.combine(before, value, extraOperation);
    this.bytes[offset] = after;
    if (this.inkPlane && offset < ZXVideoRAM.ATTRIBUTES_OFFSET) {
      this.markInk(offset, before, after, value & 0xFF, extraOperation);
    }
    return true;
  } // pokeOffset

  /**
   * Writes the attribute byte of a character cell.
   * @param {number} row - Character row, 0-23.
   * @param {number} col - Character column, 0-31.
   * @param {number} value - The attribute byte.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the cell was on the screen.
   */
  pokeAttribute(row, col, value, extraOperation) {
    if (row < 0 || row >= ZXVideoRAM.ROWS || col < 0 || col >= ZXVideoRAM.COLS) {
      return false;
    }
    return this.pokeOffset(ZXVideoRAM.ATTRIBUTES_OFFSET+row*ZXVideoRAM.COLS+col,
                           value, extraOperation);
  } // pokeAttribute

  // -------------------------------------------------------------- the ink plane

  /**
   * ## Colour at pixel resolution, without touching a single byte
   *
   * The ULA gives a cell one ink and one paper, and that is the whole of the
   * machine: two things of different colours in one 8x8 cell cannot both keep
   * theirs. That is *attribute clash*, and reproducing it is the point of this
   * class — the 6912 bytes are the model of the machine and nothing here is
   * allowed to change them.
   *
   * The ink plane sits **beside** them. It is one byte per pixel, saying which
   * ink the thing that lit that pixel was drawn with, and it is maintained by
   * the very same writes: what a write lights up takes the current `pen`, what
   * a write puts out loses its owner. So it follows the bitmap exactly, mask
   * and all, and it costs nothing to keep true — there is no second drawing
   * pass and no second model of the picture.
   *
   * {@link ZXVideoRAM#paint} then colours an owned pixel with its owner's ink
   * and every other pixel out of the cell attribute exactly as before. A game
   * that never sets a pen has no owners, so nothing changes for it, and a game
   * that sets one everywhere loses its clash while its video memory stays byte
   * for byte what the original's was.
   *
   * ★ It is therefore a **deliberate departure from the machine**, not a
   * correction of it: switch it off and the picture is the Spectrum's again.
   * A remake that measures itself against an original keeps measuring the
   * bytes; only what reaches the glass is different.
   *
   * The byte is not an attribute — it only has to carry the ink:
   *
   * ```
   *   bit 7    owned; a byte of 0 means "no owner, use the cell"
   *   bit 4    FLASH
   *   bit 3    BRIGHT
   *   bits 0-2 ink
   * ```
   */

  /** an ink plane byte with an owner in it */
  static get INK_OWNED() { return 0x80; }

  /**
   * Turns the ink plane on or off. Off is the default and costs nothing: the
   * plane is not allocated, `pokeOffset` does not look at it and `paint` is
   * the ULA's own again.
   * @param {boolean} on - Whether to keep an ink plane.
   * @returns {ZXVideoRAM} This, so calls can be chained.
   */
  enableInkPlane(on) {
    if (on && !this.inkPlane) {
      this.inkPlane = new Uint8Array(ZXVideoRAM.WIDTH*ZXVideoRAM.HEIGHT);
    } else if (!on) {
      this.inkPlane = null;
    }
    return this;
  } // enableInkPlane

  /**
   * Packs an attribute byte into an ink plane byte.
   * @param {number} attr - An attribute byte, as the game would write it.
   * @returns {number} The plane byte, with bit 7 set.
   */
  static encodeInk(attr) {
    return ZXVideoRAM.INK_OWNED | (attr & 0x07)
           | ((attr & 0x40) ? 0x08 : 0) | ((attr & 0x80) ? 0x10 : 0);
  } // encodeInk

  /**
   * Sets the pen every following write marks the pixels it lights with.
   * @param {number|null} attr - The attribute the thing being drawn carries,
   *        or null/undefined to draw **unowned** — which is what something
   *        whose colour is the cell's own business does (a rocket that is also
   *        a fuel gauge, a score printed in the colour of its row).
   * @returns {ZXVideoRAM} This.
   */
  setPen(attr) {
    this.pen = (attr === null || attr === undefined)
               ? 0 : ZXVideoRAM.encodeInk(attr);
    return this;
  } // setPen

  /**
   * Carries one write of the bitmap over into the ink plane.
   *
   * Which bits the write **drew** depends on the operation, and that is the
   * whole of the rule: 'and' is how these games rub a sprite out (they write
   * the complement of the silhouette), so it draws nothing and only takes
   * owners away; everything else draws whatever bits it wrote and left lit.
   * A bit that ended up dark loses its owner either way.
   * @param {number} offset - The bitmap offset written.
   * @param {number} before - The byte that was there.
   * @param {number} after - The byte that is there now.
   * @param {number} value - The byte the caller wrote.
   * @param {string} [extraOperation] - The operation it wrote it with.
   */
  markInk(offset, before, after, value, extraOperation) {
    var drawn = (extraOperation === 'and') ? 0 : (value & after);
    if (before === after && !drawn) {
      return;
    }
    var plane = this.inkPlane;
    var base = ZXVideoRAM.lineOfOffset(offset)*ZXVideoRAM.WIDTH+(offset & 0x1F)*8;
    var pen = this.pen;
    for (var bit = 0; bit < 8; bit++) {
      var mask = 0x80 >> bit;
      if (!(after & mask)) {
        if (before & mask) {
          plane[base+bit] = 0;
        }
      } else if (drawn & mask) {
        plane[base+bit] = pen;
      }
    }
  } // markInk

  /**
   * Forgets the owners of a rectangle of cells, so that what is drawn there
   * next starts from the cell attribute again.
   * @param {Object} [area] - {col, row, cols, rows} in cells; all of it by default.
   * @returns {ZXVideoRAM} This.
   */
  clearInk(area) {
    if (!this.inkPlane) {
      return this;
    }
    var box = ZXVideoRAM.area(area);
    for (var line = box.row*ZXVideoRAM.CELL;
         line < (box.row+box.rows)*ZXVideoRAM.CELL; line++) {
      var at = line*ZXVideoRAM.WIDTH+box.col*ZXVideoRAM.CELL;
      this.inkPlane.fill(0, at, at+box.cols*ZXVideoRAM.CELL);
    }
    return this;
  } // clearInk

  // ------------------------------------------------------------- whole areas

  /**
   * Clears the memory, or fills it with a byte. The ink plane, when there is
   * one, is wiped as well: nothing on the screen has an owner any more.
   * @param {number} [bitmap] - The byte to put in the bitmap, 0 by default.
   * @param {number} [attribute] - And in the attributes, 0 by default.
   * @returns {ZXVideoRAM} This, so calls can be chained.
   */
  clear(bitmap, attribute) {
    this.bytes.fill(bitmap || 0, 0, ZXVideoRAM.ATTRIBUTES_OFFSET);
    this.bytes.fill(attribute || 0, ZXVideoRAM.ATTRIBUTES_OFFSET, ZXVideoRAM.BYTES);
    if (this.inkPlane) {
      this.inkPlane.fill(0);
    }
    return this;
  } // clear

  /**
   * Fills the attributes of a rectangle of cells.
   * @param {Object} area - {col, row, cols, rows} in character cells.
   * @param {number} value - The attribute byte.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {ZXVideoRAM} This.
   */
  fillAttributes(area, value, extraOperation) {
    var box = ZXVideoRAM.area(area);
    for (var row = box.row; row < box.row+box.rows; row++) {
      for (var col = box.col; col < box.col+box.cols; col++) {
        this.pokeAttribute(row, col, value, extraOperation);
      }
    }
    return this;
  } // fillAttributes

  /**
   * Empties a rectangle of character cells: zero bitmap, one attribute — what
   * a game does to the rows of its panel before it composes them again.
   * @param {Object} area - {col, row, cols, rows} in character cells.
   * @param {number} [attribute] - The attribute byte of every cell, 0 by default.
   * @returns {ZXVideoRAM} This.
   */
  clearArea(area, attribute) {
    var box = ZXVideoRAM.area(area);
    for (var line = box.row*ZXVideoRAM.CELL; line < (box.row+box.rows)*ZXVideoRAM.CELL; line++) {
      var at = ZXVideoRAM.lineOffset(line)+box.col;
      this.bytes.fill(0, at, at+box.cols);
    }
    this.clearInk(box);
    return this.fillAttributes(box, attribute || 0);
  } // clearArea

  /**
   * Writes the eight bitmap bytes of one character cell — a glyph of a
   * character set, a tile of a display list. The attribute is not touched.
   * @param {number} row - Character row, 0-23.
   * @param {number} col - Character column, 0-31.
   * @param {Uint8Array|Array} cell - The eight bytes, top line first.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the cell was on the screen.
   */
  pokeCell(row, col, cell, extraOperation) {
    if (row < 0 || row >= ZXVideoRAM.ROWS || col < 0 || col >= ZXVideoRAM.COLS) {
      return false;
    }
    for (var line = 0; line < ZXVideoRAM.CELL; line++) {
      this.pokeOffset(ZXVideoRAM.lineOffset(row*ZXVideoRAM.CELL+line)+col, cell[line], extraOperation);
    }
    return true;
  } // pokeCell

  /**
   * Blits a bitmap at a pixel position, shifted inside the cell the way the
   * Spectrum blitters do it: byte by byte with the carry handed to the next
   * one, so a sprite that does not start on a cell boundary widens by a byte
   * (Underwurlde $97A5, Nodes of Yesod $9508). XOR is the usual operation —
   * that is how those games rub a sprite out again, and why it punches holes
   * in the scenery instead of covering it.
   *
   * Lines outside `area` are not written, nor bytes beyond its columns: the
   * originals never let a sprite leave its window. A zero byte is written like
   * any other, which for 'xor' and 'or' changes nothing.
   * @param {Uint8Array} bitmap - `bytesPerLine` bytes per pixel line, top line first.
   * @param {number} bytesPerLine - Width of the bitmap in bytes.
   * @param {number} height - Height of the bitmap in pixel lines.
   * @param {number} x - Left edge in pixels; may be negative or beyond the screen.
   * @param {number} y - Top edge in pixel lines of the screen; may be outside.
   * @param {Object} [area] - {col, row, cols, rows} in cells the blit is clipped to;
   *        the whole screen by default.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {number} The width of the blit in bytes: `bytesPerLine`, plus one
   *          when it was shifted — the width the attribute rules of the games
   *          work with.
   */
  blitShifted(bitmap, bytesPerLine, height, x, y, area, extraOperation) {
    var box = ZXVideoRAM.area(area);
    var top = box.row*ZXVideoRAM.CELL, bottom = (box.row+box.rows)*ZXVideoRAM.CELL;
    var shift = ((x % 8)+8) % 8;
    var byte0 = Math.floor(x/8);
    var span = bytesPerLine+(shift ? 1 : 0);
    for (var line = 0; line < height; line++) {
      var target = y+line;
      if (target < top || target >= bottom) {
        continue;
      }
      var at = ZXVideoRAM.lineOffset(target);
      var carry = 0;
      for (var i = 0; i < span; i++) {
        var source = (i < bytesPerLine) ? bitmap[line*bytesPerLine+i] : 0;
        var value = shift ? ((source >> shift) | carry) : source;
        carry = shift ? ((source << (8-shift)) & 0xFF) : 0;
        var column = byte0+i;
        if (column < box.col || column >= box.col+box.cols) {
          continue;
        }
        this.pokeOffset(at+column, value, extraOperation);
      }
    }
    return span;
  } // blitShifted

  /**
   * Replaces the whole content in one go — the fastest way to start a frame
   * from a prepared picture, and what a game does when it composes every frame
   * from a clean room rather than rubbing the last one out. The ink plane,
   * when there is one, is wiped: a whole picture carries no owners.
   * @param {ZXVideoRAM|Uint8Array|string} source - What to copy in.
   * @returns {ZXVideoRAM} This.
   */
  restore(source) {
    // duck-typed rather than `instanceof`: a Node tool that imports this
    // module without the `?ver=` query gets a second copy of the class, and a
    // memory made by one copy has to be a memory for the other (R-001)
    var memory = source && source.bytes instanceof Uint8Array && source.id === this.id;
    this.bytes.set(memory ? source.bytes : ZXVideoRAM.decode(source).subarray(0, ZXVideoRAM.BYTES));
    if (this.inkPlane) {
      // a whole picture arrives without any notion of who drew what
      this.inkPlane.fill(0);
    }
    return this;
  } // restore

  /**
   * An independent copy of this memory.
   * @returns {ZXVideoRAM} A new instance with the same bytes.
   */
  copy() {
    var made = new ZXVideoRAM();
    made.bytes.set(this.bytes);
    if (this.inkPlane) {
      made.enableInkPlane(true).inkPlane.set(this.inkPlane);
      made.pen = this.pen;
    }
    return made;
  } // copy

  /**
   * Puts a linear block — one byte per 8 pixels, rows top to bottom, plus one
   * attribute per cell — into the interleaved memory. This is how a room or a
   * panel held in a data file gets onto the screen.
   * @param {Object} area - {col, row, cols, rows} in character cells; the
   *        block is as wide and as tall as the area.
   * @param {Uint8Array|string} bitmap - cols*rows*8 bytes, or base64.
   * @param {Uint8Array|string} [attributes] - cols*rows bytes, or base64.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {ZXVideoRAM} This.
   */
  setLinear(area, bitmap, attributes, extraOperation) {
    var box = ZXVideoRAM.area(area);
    var bits = ZXVideoRAM.decode(bitmap);
    for (var line = 0; line < box.rows*ZXVideoRAM.CELL; line++) {
      var at = ZXVideoRAM.lineOffset(box.row*ZXVideoRAM.CELL+line);
      for (var col = 0; col < box.cols; col++) {
        this.pokeOffset(at+box.col+col, bits[line*box.cols+col], extraOperation);
      }
    }
    if (attributes) {
      var attr = ZXVideoRAM.decode(attributes);
      for (var row = 0; row < box.rows; row++) {
        for (var c = 0; c < box.cols; c++) {
          this.pokeAttribute(box.row+row, box.col+c, attr[row*box.cols+c], extraOperation);
        }
      }
    }
    return this;
  } // setLinear

  /**
   * The other direction: a rectangle of the memory as a linear block, which is
   * the shape the games that do not model the whole 6912 bytes pass around and
   * the shape {@link ZXVideoRAM.paintLinear} takes.
   * @param {Object} [area] - {col, row, cols, rows} in cells; the whole screen
   *        by default.
   * @returns {Object} {width, height, cols, rows, bitmap, attributes} — copies.
   */
  toLinear(area) {
    var box = ZXVideoRAM.area(area);
    var lines = box.rows*ZXVideoRAM.CELL;
    var bitmap = new Uint8Array(box.cols*lines);
    var attributes = new Uint8Array(box.cols*box.rows);
    for (var line = 0; line < lines; line++) {
      var at = ZXVideoRAM.lineOffset(box.row*ZXVideoRAM.CELL+line)+box.col;
      for (var col = 0; col < box.cols; col++) {
        bitmap[line*box.cols+col] = this.bytes[at+col];
      }
    }
    for (var row = 0; row < box.rows; row++) {
      var from = ZXVideoRAM.ATTRIBUTES_OFFSET+(box.row+row)*ZXVideoRAM.COLS+box.col;
      attributes.set(this.bytes.subarray(from, from+box.cols), row*box.cols);
    }
    return {
      width: box.cols*ZXVideoRAM.CELL, height: lines,
      cols: box.cols, rows: box.rows,
      bitmap: bitmap, attributes: attributes
    };
  } // toLinear

  // --------------------------------------------------------------- painting

  /**
   * Fills in an area, so that every caller may pass as little of it as it
   * likes and the whole screen is the default.
   * @param {Object} [area] - {col, row, cols, rows} in character cells.
   * @returns {Object} The same, with every field present and on the screen.
   */
  static area(area) {
    var box = area || {};
    var col = Math.max(0, Math.min(ZXVideoRAM.COLS, box.col || 0));
    var row = Math.max(0, Math.min(ZXVideoRAM.ROWS, box.row || 0));
    return {
      col: col, row: row,
      cols: Math.max(0, Math.min(ZXVideoRAM.COLS-col,
        box.cols === undefined ? ZXVideoRAM.COLS-col : box.cols)),
      rows: Math.max(0, Math.min(ZXVideoRAM.ROWS-row,
        box.rows === undefined ? ZXVideoRAM.ROWS-row : box.rows))
    };
  } // area

  /**
   * Paints the memory — all of it, or a rectangle of cells — into an RGBA
   * buffer, the way the ULA does it: every bit of the bitmap picks the ink or
   * the paper of the cell it falls in.
   *
   * It reads the interleaved memory **directly**, so nothing is copied into a
   * linear buffer on the way; the target is filled line by line all the same.
   *
   * The one exception to the ULA is the ink plane (enableInkPlane, setPen):
   * a lit pixel with an owner takes the owner's ink and BRIGHT instead of
   * the cell's, and the owner's own FLASH bit makes it take the paper while
   * `flashState` is on. Dark pixels and pixels without an owner are painted
   * exactly as the ULA paints them, so a screen with no owners looks as before.
   *
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, cols*8 * rows*8 * 4 bytes.
   * @param {boolean} [flashState] - When true, FLASH cells swap ink and paper.
   * @param {Object} [area] - {col, row, cols, rows} in cells; all of it by default.
   * @param {number} [attrMask] - Applied to every attribute before it is read.
   *        Games that keep something of their own in a spare bit of the
   *        attribute (a collision map in bit 7, say) mask it off here, exactly
   *        as the original masks it when it copies the shadow buffer out.
   */
  paint(rgba, flashState, area, attrMask) {
    var box = ZXVideoRAM.area(area);
    var mask = attrMask === undefined ? 0xFF : attrMask;
    var palette = ZXVideoRAM.PALETTE;
    var width = box.cols*ZXVideoRAM.CELL;
    var bytes = this.bytes;
    var plane = this.inkPlane;
    for (var row = 0; row < box.rows; row++) {
      var attrAt = ZXVideoRAM.ATTRIBUTES_OFFSET
                   +(box.row+row)*ZXVideoRAM.COLS+box.col;
      for (var pixel = 0; pixel < ZXVideoRAM.CELL; pixel++) {
        var line = row*ZXVideoRAM.CELL+pixel;
        var screenLine = (box.row+row)*ZXVideoRAM.CELL+pixel;
        var bitmapAt = ZXVideoRAM.lineOffset(screenLine)+box.col;
        var planeAt = plane ? screenLine*ZXVideoRAM.WIDTH+box.col*ZXVideoRAM.CELL : 0;
        for (var col = 0; col < box.cols; col++) {
          var bits = bytes[bitmapAt+col];
          var attr = bytes[attrAt+col] & mask;
          var ink = attr & 7;
          var paper = (attr >> 3) & 7;
          if (attr & 0x40) {
            ink += 8;
            paper += 8;
          }
          if ((attr & 0x80) && flashState) {
            var swap = ink;
            ink = paper;
            paper = swap;
          }
          var inkColor = palette[ink];
          var paperColor = palette[paper];
          for (var bit = 0; bit < 8; bit++) {
            var color;
            if (!((bits >> (7-bit)) & 1)) {
              color = paperColor;
            } else {
              // an owned pixel brings its own ink; everything else is the
              // ULA's, so a screen with no owners paints exactly as before
              var own = plane ? plane[planeAt+col*8+bit] : 0;
              if (!own) {
                color = inkColor;
              } else {
                var pen = (own & 0x07) | ((own & 0x08) ? 8 : 0);
                color = ((own & 0x10) && flashState) ? paperColor : palette[pen];
              }
            }
            var offset = (line*width+col*8+bit)*4;
            rgba[offset] = color[0];
            rgba[offset+1] = color[1];
            rgba[offset+2] = color[2];
            rgba[offset+3] = 255;
          }
        }
      }
    }
  } // paint

  /**
   * The same painting, but from a linear bitmap and attribute pair rather than
   * from the interleaved memory — for a picture that never was video memory
   * (a panel assembled cell by cell, a loading screen out of a data file) and
   * for the games that keep their play area as a pair of arrays.
   *
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, cols*8 * rows*8 * 4 bytes.
   * @param {Uint8Array|string} bitmap - One byte per 8 pixels, rows top to bottom.
   * @param {Uint8Array|string} attributes - One byte per 8x8 cell.
   * @param {number} cols - Width in character cells.
   * @param {number} rows - Height in character rows.
   * @param {boolean} [flashState] - When true, FLASH cells swap ink and paper.
   * @param {number} [attrMask] - Applied to every attribute before it is read.
   */
  static paintLinear(rgba, bitmap, attributes, cols, rows, flashState, attrMask) {
    var bits = ZXVideoRAM.decode(bitmap);
    var attr = ZXVideoRAM.decode(attributes);
    var mask = attrMask === undefined ? 0xFF : attrMask;
    var palette = ZXVideoRAM.PALETTE;
    var width = cols*ZXVideoRAM.CELL;
    for (var row = 0; row < rows; row++) {
      for (var pixel = 0; pixel < ZXVideoRAM.CELL; pixel++) {
        var line = row*ZXVideoRAM.CELL+pixel;
        for (var col = 0; col < cols; col++) {
          var byte = bits[line*cols+col];
          var cell = attr[row*cols+col] & mask;
          var ink = cell & 7;
          var paper = (cell >> 3) & 7;
          if (cell & 0x40) {
            ink += 8;
            paper += 8;
          }
          if ((cell & 0x80) && flashState) {
            var swap = ink;
            ink = paper;
            paper = swap;
          }
          var inkColor = palette[ink];
          var paperColor = palette[paper];
          for (var bit = 0; bit < 8; bit++) {
            var color = ((byte >> (7-bit)) & 1) ? inkColor : paperColor;
            var offset = (line*width+col*8+bit)*4;
            rgba[offset] = color[0];
            rgba[offset+1] = color[1];
            rgba[offset+2] = color[2];
            rgba[offset+3] = 255;
          }
        }
      }
    }
  } // paintLinear

  // ------------------------------------------------------------------ bytes

  /**
   * Decodes a base64 block into bytes; bytes that are already bytes pass
   * through untouched. The data files of the games carry video memory as
   * base64, but a room composed at run time arrives as a Uint8Array, and a
   * ZXVideoRAM (anything shaped like one: `bytes` a Uint8Array and `id`
   * 'ZXVideoRAM', duck-typed for the sake of Node tools, R-001) gives its
   * bytes. An array, ArrayBuffer or typed array view is wrapped in a
   * Uint8Array; any other object is refused.
   * @param {string|Uint8Array|ArrayBuffer|ArrayBufferView|number[]|ZXVideoRAM} data - The block.
   * @returns {Uint8Array} The bytes.
   * @throws {Error} 'ZXVideoRAM.decode: not a byte block' for an object nobody meant as bytes — failing loudly beats an empty screen.
   */
  static decode(data) {
    if (typeof data !== 'string') {
      if (data instanceof Uint8Array) {
        return data;
      }
      if (data && data.bytes instanceof Uint8Array && data.id === 'ZXVideoRAM') {
        return data.bytes;
      }
      if (data && !Array.isArray(data) && !(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
        // an object nobody meant as bytes: failing loudly beats an empty screen
        throw new Error('ZXVideoRAM.decode: not a byte block');
      }
      return data ? new Uint8Array(data) : new Uint8Array(0);
    }
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } // decode

  /**
   * Decodes a hex string into bytes — how the character sets are stored.
   * @param {string} hex - Two hex digits per byte.
   * @returns {Uint8Array} The bytes.
   */
  static hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length/2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i*2, 2), 16);
    }
    return bytes;
  } // hexToBytes

} // ZXVideoRAM

/** built once, on the first call of the PALETTE getter */
ZXVideoRAM.paletteRGB = null;
