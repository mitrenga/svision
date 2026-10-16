const { C64Color } = await import('./c64Color.js?ver='+window.srcVersion);
// begin code

/**
 * The hardware sprites of the VIC-II, as data: how the 63 bytes of a sprite
 * become a frame a {@link SpriteEntity} can show, and back.
 *
 * A sprite is **24 x 21 pixels, three bytes a row, 63 bytes** in all, kept in
 * a 64-byte block somewhere in the VIC's 16 KB bank and pointed to by the
 * sprite pointers at the end of the screen RAM ($07F8-$07FF). Two shapes:
 *
 * - **hires** — a set bit is the sprite's colour ($D027-$D02E), a clear bit
 *   is transparent;
 * - **multicolour** (bit of $D01C set) — pixel pairs, 12 x 21 pixels twice
 *   as wide: `00` transparent, `01` the shared colour $D025, `10` the
 *   sprite's own colour, `11` the shared colour $D026.
 *
 * Either can be doubled in width ($D01D) or height ($D017) — the pixels get
 * bigger, the data does not. Eight sprites are shown at once; a game that
 * wants more moves them between raster lines, which is its own business.
 *
 * ## The frame a sprite entity gets
 *
 * `decode()` returns a character grid the way every sprite in the library is
 * described, with one character per **palette key**: `.` transparent, `1`
 * the shared colour 1, `2` the sprite's own colour, `3` the shared colour 2.
 * A hires sprite uses only `2`, so the same palette serves both shapes and
 * the two shared registers are, as on the chip, shared by every sprite that
 * paints with them: change $D025 and every multicolour sprite changes with
 * one `setSharedPalette()`. {@link C64SpriteEntity} wraps that up.
 *
 * ## Positions
 *
 * The hardware counts sprite positions from the top left of the whole
 * raster including the border: X 24 and Y 50 is the top left of the 320x200
 * picture. `toDesktop()` and `fromDesktop()` translate; the visible area is
 * X 24-343, Y 50-249, and X above 255 needs the ninth bit in $D010.
 *
 * Nothing here touches the DOM (R-001).
 */
export class C64SpriteData {

  /** pixels in a hires sprite */
  static get WIDTH() { return 24; }
  static get HEIGHT() { return 21; }
  /** bytes of shape, and the block they live in */
  static get BYTES() { return 63; }
  static get BLOCK() { return 64; }
  /** where the picture starts in sprite coordinates */
  static get ORIGIN_X() { return 24; }
  static get ORIGIN_Y() { return 50; }
  /** the palette keys of the grid */
  static get TRANSPARENT() { return '.'; }
  static get KEYS() { return ['.', '1', '2', '3']; }

  /**
   * Turns the 63 bytes of a sprite into a character grid.
   * @param {Uint8Array|number[]} bytes - At least 63 bytes, the shape first.
   * @param {Object} [options] - `multicolor` (false), `expandX` (false), `expandY` (false).
   * @returns {string[]} 21 rows (42 with expandY) of 24 characters (48 with expandX).
   */
  static decode(bytes, options) {
    var opts = options || {};
    var keys = C64SpriteData.KEYS;
    var grid = [];
    for (var row = 0; row < C64SpriteData.HEIGHT; row++) {
      var line = '';
      var b0 = bytes[row*3], b1 = bytes[row*3+1], b2 = bytes[row*3+2];
      var bits = (b0 << 16) | (b1 << 8) | b2;
      if (opts.multicolor) {
        for (var pair = 11; pair >= 0; pair--) {
          var key = keys[(bits >> (pair*2)) & 3];
          line += key+key;
        }
      } else {
        for (var bit = 23; bit >= 0; bit--) {
          line += (bits >> bit) & 1 ? keys[2] : keys[0];
        }
      }
      if (opts.expandX) {
        var wide = '';
        for (var i = 0; i < line.length; i++) {
          wide += line[i]+line[i];
        }
        line = wide;
      }
      grid.push(line);
      if (opts.expandY) {
        grid.push(line);
      }
    }
    return grid;
  } // decode

  /**
   * Turns a character grid back into the 63 bytes — for building sprites in
   * code and for the checks. The grid is read unexpanded: 21 rows of 24
   * characters (12 pairs in multicolour, the first character of a pair
   * counts). Any character other than `.` and space is a set pixel in hires.
   * @param {string[]} grid - The rows.
   * @param {Object} [options] - `multicolor` (false).
   * @returns {Uint8Array} 63 bytes.
   */
  static encode(grid, options) {
    var opts = options || {};
    var bytes = new Uint8Array(C64SpriteData.BYTES);
    for (var row = 0; row < C64SpriteData.HEIGHT; row++) {
      var line = grid[row] || '';
      var bits = 0;
      if (opts.multicolor) {
        for (var pair = 0; pair < 12; pair++) {
          var ch = line[pair*2] || '.';
          var value = C64SpriteData.KEYS.indexOf(ch);
          bits = (bits << 2) | (value < 0 ? 0 : value);
        }
      } else {
        for (var col = 0; col < C64SpriteData.WIDTH; col++) {
          var c = line[col] || '.';
          bits = (bits << 1) | (c !== '.' && c !== ' ' ? 1 : 0);
        }
      }
      bytes[row*3] = (bits >> 16) & 0xFF;
      bytes[row*3+1] = (bits >> 8) & 0xFF;
      bytes[row*3+2] = bits & 0xFF;
    }
    return bytes;
  } // encode

  /**
   * Decodes a run of 64-byte blocks — the frames of an animation stored one
   * after another, the way the sprite pointers address them.
   * @param {Uint8Array} bytes - The memory.
   * @param {number} offset - Where the first block starts.
   * @param {number} count - How many blocks.
   * @param {Object} [options] - As for {@link C64SpriteData.decode}.
   * @returns {string[][]} One grid per block.
   */
  static decodeBlocks(bytes, offset, count, options) {
    var frames = [];
    for (var i = 0; i < count; i++) {
      var at = offset+i*C64SpriteData.BLOCK;
      frames.push(C64SpriteData.decode(bytes.subarray(at, at+C64SpriteData.BYTES), options));
    }
    return frames;
  } // decodeBlocks

  /**
   * The palette of a sprite from its three registers.
   * @param {number} color - The sprite's own colour, 0-15 ($D027+n).
   * @param {number} [multicolor1] - $D025, 0-15; the palette has no `1` without it.
   * @param {number} [multicolor2] - $D026, 0-15; the palette has no `3` without it.
   * @returns {Object} {1?, 2, 3?} → hex colours, for `setSharedPalette()`.
   */
  static palette(color, multicolor1, multicolor2) {
    var palette = {'2': C64Color.color(color)};
    if (multicolor1 !== undefined) {
      palette['1'] = C64Color.color(multicolor1);
    }
    if (multicolor2 !== undefined) {
      palette['3'] = C64Color.color(multicolor2);
    }
    return palette;
  } // palette

  /**
   * Sprite coordinates → desktop pixels.
   * @param {number} x - The sprite X, 0-511 (bit 8 from $D010).
   * @param {number} y - The sprite Y, 0-255.
   * @returns {Object} {x, y} on the 320x200 desktop; may be negative or past the edge.
   */
  static toDesktop(x, y) {
    return {x: x-C64SpriteData.ORIGIN_X, y: y-C64SpriteData.ORIGIN_Y};
  } // toDesktop

  /**
   * Desktop pixels → sprite coordinates.
   * @param {number} x - Desktop X.
   * @param {number} y - Desktop Y.
   * @returns {Object} {x, y} as the registers would hold them.
   */
  static fromDesktop(x, y) {
    return {x: x+C64SpriteData.ORIGIN_X, y: y+C64SpriteData.ORIGIN_Y};
  } // fromDesktop

} // C64SpriteData
