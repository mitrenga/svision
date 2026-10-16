const { VGAPalette } = await import('./vgaPalette.js?ver='+window.srcVersion);
// begin code

/**
 * The video memory of a VGA card in mode 13h — the 320x200, 256-colour mode
 * that nearly every DOS game of the VGA era ran in, because it is the one
 * mode where a pixel is simply a byte: 64000 bytes at A000:0000, one byte per
 * pixel, 320 pixels to a line, 200 lines, laid out plainly from the top left
 * corner. A byte is not a colour but the number of a register in the
 * {@link VGAPalette}; the DAC turns it into a colour on the way to the monitor.
 *
 * This is the **model of the machine**, not of any game. What a game puts into
 * the memory — which sprite, decoded how — is the game's business; that a pixel
 * is a byte, where a pixel's byte is and how bytes become coloured pixels is
 * the card's, and belongs here. The same class serves Prince of Persia and the
 * three Gobliiins, and any other mode 13h game that comes after them.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document`, a canvas or a worker API, so the very same
 * code runs in the browser and in an offline `match*` tool under Node (R-001).
 * The entity that owns a canvas and a cache is {@link VGAVideoRAMEntity}, kept
 * in a separate file for exactly that reason.
 *
 * ## Writing
 *
 * Plain writes only. The logical operations {@link ZXVideoRAM} has (`xor`,
 * `and`, `or`) are instructions a Spectrum game runs on a bitmap byte; in
 * mode 13h a byte is one pixel and the games of the era draw by copying with
 * a transparent colour, which is what {@link VGAVideoRAM#blit} does. Prince of
 * Persia keeps two more layers than the screen — a background it restores
 * from and a set of sprites over it — and all three are instances of this
 * class, copied into one another with `blit()` and `copyRect()`.
 *
 * ```js
 * var vram = new VGAVideoRAM();
 * vram.fill(0);
 * vram.blit(sprite, 40, 100, {transparent: 0});
 * ```
 *
 * Anything outside the 320x200 rectangle is clipped: a sprite half off the
 * edge shows its half, a write beyond the last byte is dropped.
 */
export class VGAVideoRAM {

  /** the linear address the memory starts at (segment A000) */
  static get BASE() { return 0xA0000; }
  /** the picture in pixels */
  static get WIDTH() { return 320; }
  static get HEIGHT() { return 200; }
  /** the whole of it: one byte per pixel */
  static get BYTES() { return 64000; }

  /**
   * @param {Uint8Array|ArrayBuffer|string} [bytes] - Initial content: 64000
   *        bytes, or a base64 block of them. Anything shorter is copied to the
   *        start and the rest stays zero. Sizes other than the screen are for
   *        off-screen buffers, see {@link VGAVideoRAM.buffer}.
   * @param {number} [width] - Width of an off-screen buffer; the screen's by default.
   * @param {number} [height] - Height of an off-screen buffer; the screen's by default.
   */
  constructor(bytes, width, height) {
    this.id = 'VGAVideoRAM';

    /** the width in pixels — the screen's, or an off-screen buffer's own */
    this.width = width === undefined ? VGAVideoRAM.WIDTH : width;
    /** the height in pixels */
    this.height = height === undefined ? VGAVideoRAM.HEIGHT : height;
    /** the pixels, one byte each, line by line */
    this.bytes = new Uint8Array(this.width*this.height);
    if (bytes) {
      var source = VGAVideoRAM.decode(bytes);
      this.bytes.set(source.subarray(0, Math.min(source.length, this.bytes.length)));
    }
  } // constructor

  /**
   * An off-screen buffer of any size in the same format — a decoded sprite, a
   * room background kept to restore from, a whole picture drawn before it is
   * shown. Blits between buffers and the screen are the same call.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @param {Uint8Array|string} [bytes] - Initial content, width*height bytes.
   * @returns {VGAVideoRAM} The buffer.
   */
  static buffer(width, height, bytes) {
    return new VGAVideoRAM(bytes, width, height);
  } // buffer

  // ------------------------------------------------------------- addressing

  /**
   * The offset of a pixel from the start of the memory.
   * @param {number} x - Pixel column, 0 to `width`-1.
   * @param {number} y - Pixel line, 0 to `height`-1.
   * @returns {number} y*width+x (320 wide on the screen, an off-screen
   *          buffer's own width otherwise).
   */
  offsetOf(x, y) {
    return y*this.width+x;
  } // offsetOf

  /**
   * Whether a position is inside the picture.
   * @param {number} x - Pixel column.
   * @param {number} y - Pixel line.
   * @returns {boolean} True when a pixel is there.
   */
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  } // inside

  // ------------------------------------------------------------------ reading

  /**
   * Reads one byte at its offset from the start of the memory (A000:0000
   * on the screen).
   * @param {number} offset - 0 to `bytes.length`-1 (63999 on the screen).
   * @returns {number} The byte, or 0 outside the memory.
   */
  peekOffset(offset) {
    if (offset < 0 || offset >= this.bytes.length) {
      return 0;
    }
    return this.bytes[offset];
  } // peekOffset

  /**
   * Reads the pixel at a position.
   * @param {number} x - Pixel column.
   * @param {number} y - Pixel line.
   * @returns {number} The palette index, or 0 outside the picture.
   */
  pixel(x, y) {
    if (!this.inside(x, y)) {
      return 0;
    }
    return this.bytes[y*this.width+x];
  } // pixel

  // ------------------------------------------------------------------ writing

  /**
   * Writes one byte at its offset from the start of the memory (A000:0000
   * on the screen).
   * @param {number} offset - 0 to `bytes.length`-1 (63999 on the screen).
   * @param {number} value - The palette index.
   * @returns {boolean} True when the byte was inside the memory.
   */
  pokeOffset(offset, value) {
    if (offset < 0 || offset >= this.bytes.length) {
      return false;
    }
    this.bytes[offset] = value;
    return true;
  } // pokeOffset

  /**
   * Writes the pixel at a position, dropping it when it is off the picture.
   * @param {number} x - Pixel column.
   * @param {number} y - Pixel line.
   * @param {number} value - The palette index.
   * @returns {boolean} True when the pixel was inside the picture.
   */
  setPixel(x, y, value) {
    if (!this.inside(x, y)) {
      return false;
    }
    this.bytes[y*this.width+x] = value;
    return true;
  } // setPixel

  /**
   * Fills the whole memory with one index — the state after a mode switch is
   * all zeroes, which the default palette shows black.
   * @param {number} [value] - The index, 0 by default.
   * @returns {VGAVideoRAM} This, so calls can be chained.
   */
  fill(value) {
    this.bytes.fill(value || 0);
    return this;
  } // fill

  /**
   * Fills a rectangle with one index, clipped to the picture.
   * @param {number} x - Left edge, may be negative.
   * @param {number} y - Top edge, may be negative.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @param {number} value - The palette index.
   * @returns {VGAVideoRAM} This.
   */
  fillRect(x, y, width, height, value) {
    var box = this.clip(x, y, width, height);
    if (box === null) {
      return this;
    }
    for (var line = box.y; line < box.y+box.height; line++) {
      this.bytes.fill(value, line*this.width+box.x, line*this.width+box.x+box.width);
    }
    return this;
  } // fillRect

  /**
   * Draws a horizontal line, clipped — the border of a panel, the floor of a
   * test picture.
   * @param {number} x - Left end.
   * @param {number} y - The line.
   * @param {number} length - In pixels.
   * @param {number} value - The palette index.
   * @returns {VGAVideoRAM} This.
   */
  hLine(x, y, length, value) {
    return this.fillRect(x, y, length, 1, value);
  } // hLine

  /**
   * Draws a vertical line, clipped.
   * @param {number} x - The column.
   * @param {number} y - Top end.
   * @param {number} length - In pixels.
   * @param {number} value - The palette index.
   * @returns {VGAVideoRAM} This.
   */
  vLine(x, y, length, value) {
    return this.fillRect(x, y, 1, length, value);
  } // vLine

  /**
   * Copies a buffer into this one at a position — the one drawing operation the
   * games of the era do, with a colour that is not copied so that a sprite has
   * a shape and not a box round it. Clipped on every side.
   *
   * @param {VGAVideoRAM} source - What to copy: a sprite, a background, a whole screen.
   * @param {number} x - Where its left edge goes, may be negative.
   * @param {number} y - Where its top edge goes, may be negative.
   * @param {Object} [options] - `transparent`: an index that is not copied
   *        (none by default); `flipX` / `flipY`: mirror the source; `rect`:
   *        {x, y, width, height} of the source to copy, all of it by default.
   * @returns {VGAVideoRAM} This.
   */
  blit(source, x, y, options) {
    var opts = options || {};
    var rect = opts.rect || {x: 0, y: 0, width: source.width, height: source.height};
    var transparent = opts.transparent === undefined ? -1 : opts.transparent;
    var flipX = !!opts.flipX;
    var flipY = !!opts.flipY;
    var box = this.clip(x, y, rect.width, rect.height);
    if (box === null) {
      return this;
    }
    var target = this.bytes;
    var pixels = source.bytes;
    for (var line = 0; line < box.height; line++) {
      var ty = box.y+line;
      var sy = flipY ? rect.y+rect.height-1-(ty-y) : rect.y+(ty-y);
      var targetAt = ty*this.width+box.x;
      var sourceLine = sy*source.width;
      for (var col = 0; col < box.width; col++) {
        var tx = box.x+col;
        var sx = flipX ? rect.x+rect.width-1-(tx-x) : rect.x+(tx-x);
        var value = pixels[sourceLine+sx];
        if (value !== transparent) {
          target[targetAt+col] = value;
        }
      }
    }
    return this;
  } // blit

  /**
   * Copies a rectangle of this memory to another place in it — or into another
   * buffer — overlapping allowed, the way `REP MOVSB` does it when the game
   * scrolls or saves what a sprite is about to cover.
   * @param {number} x - Left edge of the source rectangle.
   * @param {number} y - Top edge of the source rectangle.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @param {number} toX - Where the left edge goes.
   * @param {number} toY - Where the top edge goes.
   * @param {VGAVideoRAM} [target] - Where to; this memory by default.
   * @returns {VGAVideoRAM} The target.
   */
  copyRect(x, y, width, height, toX, toY, target) {
    var to = target || this;
    var rect = {x: x, y: y, width: width, height: height};
    if (to === this) {
      // a copy of the source first, so an overlap cannot read what was just written
      var snapshot = VGAVideoRAM.buffer(width, height);
      snapshot.blit(this, -x, -y);
      return to.blit(snapshot, toX, toY);
    }
    return to.blit(this, toX, toY, {rect: rect});
  } // copyRect

  /**
   * Writes text with a bitmap font, one palette index for the ink and,
   * optionally, one for the paper behind it — what INT 10h did in a graphics
   * mode with the ROM font, and what a test picture or a debug overlay needs.
   * The game's own lettering is a sprite like any other and does not come
   * through here.
   * @param {Object} font - Anything with `glyphBytes(codePoint)` returning row
   *        masks 8 pixels wide; {@link VGAFonts8x16} gives 16 rows.
   * @param {number} x - Left edge of the first glyph.
   * @param {number} y - Top edge.
   * @param {string} text - The text; a glyph the font lacks shows as '?'.
   * @param {number} ink - The index of the set pixels.
   * @param {number} [paper] - The index of the unset pixels; left alone without it.
   * @returns {VGAVideoRAM} This.
   */
  drawText(font, x, y, text, ink, paper) {
    var at = x;
    for (var i = 0; i < text.length; i++) {
      var rows = font.glyphBytes(text.codePointAt(i));
      for (var line = 0; line < rows.length; line++) {
        var mask = rows[line];
        for (var bit = 0; bit < 8; bit++) {
          if (mask & (0x80 >> bit)) {
            this.setPixel(at+bit, y+line, ink);
          } else if (paper !== undefined) {
            this.setPixel(at+bit, y+line, paper);
          }
        }
      }
      at += 8;
    }
    return this;
  } // drawText

  /**
   * Puts a whole picture into the memory at once — a title screen decoded
   * from a data file, a room background kept in a buffer.
   * @param {VGAVideoRAM|Uint8Array|string|Object} source - The bytes, or a
   *        parsed data file holding them in a `videoRAM` field (R-016), which
   *        is what {@link AbstractModel#loadDataFile} hands back.
   * @returns {VGAVideoRAM} This.
   */
  restore(source) {
    var bytes = VGAVideoRAM.decode(source && source.videoRAM !== undefined ? source.videoRAM : source);
    this.bytes.fill(0);
    this.bytes.set(bytes.subarray(0, Math.min(bytes.length, this.bytes.length)));
    return this;
  } // restore

  /**
   * An independent copy of the memory — for a game that keeps a background
   * to draw its sprites over and to restore from.
   * @returns {VGAVideoRAM} The copy, same size.
   */
  copy() {
    return new VGAVideoRAM(this.bytes, this.width, this.height);
  } // copy

  /**
   * Cuts a rectangle out into a new buffer — a sprite out of a sheet.
   * @param {number} x - Left edge.
   * @param {number} y - Top edge.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @returns {VGAVideoRAM} A new buffer holding the rectangle; parts outside
   *          this memory come out as zeroes.
   */
  cut(x, y, width, height) {
    var piece = VGAVideoRAM.buffer(width, height);
    piece.blit(this, -x, -y);
    return piece;
  } // cut

  /**
   * Whether two memories hold the same pixels — the check a `match*` tool
   * makes against a frame recorded from the original.
   * @param {VGAVideoRAM} other - The memory to compare with.
   * @returns {number} The number of pixels that differ; 0 when identical.
   */
  differences(other) {
    if (other.width !== this.width || other.height !== this.height) {
      return this.bytes.length;
    }
    var count = 0;
    for (var i = 0; i < this.bytes.length; i++) {
      if (this.bytes[i] !== other.bytes[i]) {
        count++;
      }
    }
    return count;
  } // differences

  /**
   * Clips a rectangle to the picture.
   * @param {number} x - Left edge, may be negative.
   * @param {number} y - Top edge, may be negative.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @returns {Object|null} {x, y, width, height} of the part inside, or null
   *          when nothing is.
   */
  clip(x, y, width, height) {
    var x0 = Math.max(0, x), y0 = Math.max(0, y);
    var x1 = Math.min(this.width, x+width), y1 = Math.min(this.height, y+height);
    if (x0 >= x1 || y0 >= y1) {
      return null;
    }
    return {x: x0, y: y0, width: x1-x0, height: y1-y0};
  } // clip

  // ------------------------------------------------------------ to the screen

  /**
   * Paints the memory into an RGBA buffer through a palette, the way the DAC
   * does it: every byte picks a register, the register gives the colour.
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, width * height * 4 bytes.
   * @param {VGAPalette} palette - The registers the bytes point into.
   * @returns {VGAVideoRAM} This.
   */
  paint(rgba, palette) {
    var bytes = this.bytes;
    var registers = palette.bytes;
    for (var i = 0, offset = 0; i < bytes.length; i++, offset += 4) {
      var at = bytes[i]*3;
      rgba[offset] = VGAPalette.to8bit(registers[at]);
      rgba[offset+1] = VGAPalette.to8bit(registers[at+1]);
      rgba[offset+2] = VGAPalette.to8bit(registers[at+2]);
      rgba[offset+3] = 255;
    }
    return this;
  } // paint

  /**
   * The same painting through a packed lookup table — one 32-bit write per
   * pixel — which is how {@link VGAVideoRAMEntity} does it every game frame.
   * @param {Uint32Array} pixels - Target, width * height elements.
   * @param {Uint32Array} lookup - 256 packed pixels, from {@link VGAPalette#lookup}.
   * @returns {VGAVideoRAM} This.
   */
  paint32(pixels, lookup) {
    var bytes = this.bytes;
    for (var i = 0; i < bytes.length; i++) {
      pixels[i] = lookup[bytes[i]];
    }
    return this;
  } // paint32

  // ------------------------------------------------------------------ bytes

  /**
   * Decodes a base64 block into bytes; bytes that are already bytes pass
   * through untouched. Data files carry pictures as base64, a buffer composed
   * at run time arrives as a Uint8Array.
   * @param {string|Uint8Array|ArrayBuffer|VGAVideoRAM} data - The block.
   * @returns {Uint8Array} The bytes.
   */
  static decode(data) {
    if (typeof data !== 'string') {
      if (data instanceof Uint8Array) {
        return data;
      }
      if (data && data.bytes instanceof Uint8Array && data.id === 'VGAVideoRAM') {
        return data.bytes;
      }
      if (data && !Array.isArray(data) && !(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
        // an object nobody meant as bytes: failing loudly beats an empty screen
        throw new Error('VGAVideoRAM.decode: not a byte block');
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

} // VGAVideoRAM
