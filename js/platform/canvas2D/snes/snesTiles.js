// begin code

/**
 * The planar tiles of the Super Nintendo's VRAM — the format a background
 * character and a sprite are stored in, and the one place the library
 * decodes and encodes it (the counterpart of `C64SpriteData` and the ZX
 * `ZXVideoRAM` byte layouts: a format belongs to its platform).
 *
 * A tile is 8×8 pixels of **2, 4 or 8 bit planes**, two planes to a word
 * and one word to a row: bytes 0-15 hold planes 0 and 1 of the eight rows
 * (low byte plane 0, high byte plane 1, bit 7 the leftmost pixel), bytes
 * 16-31 planes 2 and 3, bytes 32-63 planes 4-7. So a tile is 16, 32 or 64
 * bytes — 8, 16 or 32 words — and the PPU addresses VRAM in words, which
 * is why the methods take a **word address**.
 *
 * ```js
 * var tile = SNESTiles.decode(ppu.vram, 0x4000, 4);   // 64 indices 0-15
 * ppu.vram.set(SNESTiles.encode(tile, 4), 0x4000*2);
 * ```
 */
export class SNESTiles {

  /**
   * The size of a tile in bytes.
   * @param {number} bpp - 2, 4 or 8.
   * @returns {number} 16, 32 or 64.
   */
  static bytes(bpp) {
    return 8*bpp;
  } // bytes

  /**
   * The size of a tile in words.
   * @param {number} bpp - 2, 4 or 8.
   * @returns {number} 8, 16 or 32.
   */
  static words(bpp) {
    return 4*bpp;
  } // words

  /**
   * One pixel of a tile in VRAM.
   * @param {Uint8Array} vram - The 64 KB.
   * @param {number} word - The word address of the tile.
   * @param {number} bpp - 2, 4 or 8.
   * @param {number} x - 0-7, from the left.
   * @param {number} y - 0-7, from the top.
   * @returns {number} The colour index, 0 is transparent.
   */
  static pixel(vram, word, bpp, x, y) {
    var at = ((word & 0x7FFF) << 1)+(y << 1);
    var bit = 7-(x & 7);
    var color = 0;
    for (var pair = 0; pair < bpp/2; pair++) {
      var o = (at+pair*16) & 0xFFFF;
      color |= ((vram[o] >> bit) & 1) << (pair*2);
      color |= ((vram[o+1] >> bit) & 1) << (pair*2+1);
    }
    return color;
  } // pixel

  /**
   * A whole tile as 64 colour indices, row by row.
   * @param {Uint8Array} vram - The 64 KB.
   * @param {number} word - The word address of the tile.
   * @param {number} bpp - 2, 4 or 8.
   * @returns {Uint8Array} 64 indices.
   */
  static decode(vram, word, bpp) {
    var out = new Uint8Array(64);
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        out[y*8+x] = SNESTiles.pixel(vram, word, bpp, x, y);
      }
    }
    return out;
  } // decode

  /**
   * 64 colour indices as the bytes of a tile.
   * @param {Uint8Array|number[]} indices - 64 values, row by row.
   * @param {number} bpp - 2, 4 or 8.
   * @returns {Uint8Array} 16, 32 or 64 bytes.
   */
  static encode(indices, bpp) {
    var out = new Uint8Array(8*bpp);
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        var color = indices[y*8+x] & ((1 << bpp)-1);
        var bit = 7-x;
        for (var plane = 0; plane < bpp; plane++) {
          if (color & (1 << plane)) {
            out[(plane >> 1)*16+(y << 1)+(plane & 1)] |= 1 << bit;
          }
        }
      }
    }
    return out;
  } // encode

  /**
   * A tile out of rows of text, as a demo or a check writes one: a digit is
   * the colour index, '.' and ' ' are 0.
   * @param {string[]} rows - Eight strings of eight characters.
   * @param {number} bpp - 2, 4 or 8.
   * @returns {Uint8Array} The bytes.
   */
  static fromText(rows, bpp) {
    var indices = new Uint8Array(64);
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        var ch = (rows[y] || '').charAt(x);
        indices[y*8+x] = (ch === '' || ch === '.' || ch === ' ') ? 0 : parseInt(ch, 16);
      }
    }
    return SNESTiles.encode(indices, bpp);
  } // fromText

} // SNESTiles
