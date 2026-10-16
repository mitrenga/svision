const { C64TextRAM } = await import('./c64TextRAM.js?ver='+window.srcVersion);
// begin code

/**
 * A character set of a game's own, in the form {@link C64TextRAM} asks for:
 * `glyphBytes(code, set)`. On the machine the VIC-II reads the glyph of a
 * screen code straight out of 2 KB of memory the character pointer of $D018
 * points at — eight bytes a code, 256 codes, and **no inversion in hardware**:
 * what a game wants inverted it stores inverted. That is the difference from
 * {@link C64Fonts8x8}, which carries the character ROM, where the upper 128
 * codes are the inverted halves of the set.
 *
 * A set is 2048 bytes. Hand over more than one and they become sets 0, 1, …,
 * the way a game flips between them by rewriting $D018.
 *
 * ```js
 * var charset = new C64Charset(bytesFromTheOriginal);   // 2 KB
 * text.paint32(pixels, charset, littleEndian);
 * ```
 */
export class C64Charset {

  /** bytes in one set */
  static get SET_BYTES() { return 2048; }
  /** bytes in one glyph */
  static get GLYPH_BYTES() { return 8; }
  /** codes in one set */
  static get CODES() { return 256; }

  /**
   * @param {...(Uint8Array|Array<number>)} sets - One 2 KB block a set.
   */
  constructor() {
    this.id = 'C64Charset';
    /** the sets, each 2048 bytes */
    this.sets = [];
    for (var i = 0; i < arguments.length; i++) {
      this.addSet(arguments[i]);
    }
  } // constructor

  /**
   * Adds a set.
   * @param {Uint8Array|Array<number>} bytes - 2048 bytes; shorter is padded
   *        with zeroes, longer is cut.
   * @returns {C64Charset} This.
   */
  addSet(bytes) {
    var set = new Uint8Array(C64Charset.SET_BYTES);
    var from = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    set.set(from.subarray(0, C64Charset.SET_BYTES));
    this.sets.push(set);
    return this;
  } // addSet

  /**
   * Replaces the bytes of one glyph — what a game does when it animates a
   * character in place.
   * @param {number} code - 0-255.
   * @param {Uint8Array|Array<number>} rows - Eight row masks.
   * @param {number} [set] - Which set; 0 by default.
   * @returns {C64Charset} This.
   */
  setGlyph(code, rows, set) {
    var bytes = this.sets[set || 0];
    if (!bytes) return this;
    var at = (code & 255)*C64Charset.GLYPH_BYTES;
    for (var i = 0; i < C64Charset.GLYPH_BYTES; i++) {
      bytes[at+i] = rows[i] & 255;
    }
    return this;
  } // setGlyph

  /**
   * The eight row masks of a code, which is what {@link C64TextRAM} paints
   * with. No inversion: the set is what the VIC-II would read.
   * @param {number} code - 0-255.
   * @param {number} [set] - Which set; 0 by default, and 0 again when the
   *        set asked for is not there.
   * @returns {Uint8Array} Eight bytes, the top row first.
   */
  glyphBytes(code, set) {
    var bytes = this.sets[set] || this.sets[0];
    if (!bytes) return new Uint8Array(C64Charset.GLYPH_BYTES);
    var at = (code & 255)*C64Charset.GLYPH_BYTES;
    return bytes.subarray(at, at+C64Charset.GLYPH_BYTES);
  } // glyphBytes

  /**
   * The whole set as bytes — for a tool that wants to write it out again.
   * @param {number} [set] - Which set; 0 by default.
   * @returns {Uint8Array} 2048 bytes.
   */
  setBytes(set) {
    return this.sets[set] || this.sets[0] || new Uint8Array(C64Charset.SET_BYTES);
  } // setBytes

} // C64Charset
