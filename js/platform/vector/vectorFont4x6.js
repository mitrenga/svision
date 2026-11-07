const { AbstractVectorFont } = await import('./abstractVectorFont.js?ver='+window.srcVersion);
// begin code

/**
 * The library's own vector font: capitals, digits and the punctuation a
 * menu needs, rounded shapes on a 4x6 grid with a 2 unit gap (cell 6
 * wide), a descender to y 7. Drawn by hand for the vector platform
 * (BZ-M2, 2026-09-15), when no ROM font was there yet — the counterpart of
 * the raster Fonts4x6, for an application on the vector platform without a
 * machine of its own (vectordemo, msi). The remakes of Atari's XY games
 * use AtariVectorFont instead.
 *
 * A glyph is `{strokes: [[x, y, x, y, ...], ...], circles: [[cx, cy, r], ...]}`
 * in grid units, x 0..4, y 0 (top of a capital) .. 6 (baseline). Lower case
 * draws as capitals (AbstractVectorFont.glyph).
 */
export class VectorFont4x6 extends AbstractVectorFont {

  /** the cell: 4x6, advance 6 (one glyph plus the gap), descenders 1 below the baseline */
  static get METRICS() { return {width: 4, height: 6, advance: 6, descent: 1}; }

  constructor() {
    super(VectorFont4x6.glyphs(), VectorFont4x6.METRICS);
  } // constructor

  /**
   * The glyph table. Strokes are flat point lists on the 4x6 grid (x 0-4,
   * y 0-6, y down); a descender goes to y 7.
   * @returns {Object}
   */
  static glyphs() {
    var s = (strokes) => ({strokes: strokes});
    var O = [1,0, 3,0, 4,1, 4,5, 3,6, 1,6, 0,5, 0,1, 1,0];
    var P = [0,6, 0,0, 3,0, 4,1, 4,2, 3,3, 0,3];
    return {
      ' ': s([]),
      'A': s([[0,6, 0,2, 2,0, 4,2, 4,6], [0,4, 4,4]]),
      'B': s([[0,6, 0,0, 3,0, 4,1, 4,2, 3,3, 0,3], [3,3, 4,4, 4,5, 3,6, 0,6]]),
      'C': s([[4,1, 3,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5]]),
      'D': s([[0,6, 0,0, 3,0, 4,1, 4,5, 3,6, 0,6]]),
      'E': s([[4,0, 0,0, 0,6, 4,6], [0,3, 3,3]]),
      'F': s([[4,0, 0,0, 0,6], [0,3, 3,3]]),
      'G': s([[4,1, 3,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5, 4,3, 2,3]]),
      'H': s([[0,0, 0,6], [4,0, 4,6], [0,3, 4,3]]),
      'I': s([[1,0, 3,0], [2,0, 2,6], [1,6, 3,6]]),
      'J': s([[4,0, 4,5, 3,6, 1,6, 0,5]]),
      'K': s([[0,0, 0,6], [4,0, 0,4], [1,3, 4,6]]),
      'L': s([[0,0, 0,6, 4,6]]),
      'M': s([[0,6, 0,0, 2,3, 4,0, 4,6]]),
      'N': s([[0,6, 0,0, 4,6, 4,0]]),
      'O': s([O]),
      'P': s([P]),
      'Q': s([O, [2,4, 4,6]]),
      'R': s([P, [2,3, 4,6]]),
      'S': s([[4,1, 3,0, 1,0, 0,1, 0,2, 1,3, 3,3, 4,4, 4,5, 3,6, 1,6, 0,5]]),
      'T': s([[0,0, 4,0], [2,0, 2,6]]),
      'U': s([[0,0, 0,5, 1,6, 3,6, 4,5, 4,0]]),
      'V': s([[0,0, 2,6, 4,0]]),
      'W': s([[0,0, 1,6, 2,2, 3,6, 4,0]]),
      'X': s([[0,0, 4,6], [4,0, 0,6]]),
      'Y': s([[0,0, 2,3, 4,0], [2,3, 2,6]]),
      'Z': s([[0,0, 4,0, 0,6, 4,6]]),
      '0': s([O, [0,5, 4,1]]),
      '1': s([[1,1, 2,0, 2,6], [1,6, 3,6]]),
      '2': s([[0,1, 1,0, 3,0, 4,1, 4,2, 0,6, 4,6]]),
      '3': s([[0,0, 4,0, 2,3, 3,3, 4,4, 4,5, 3,6, 1,6, 0,5]]),
      '4': s([[3,6, 3,0, 0,4, 4,4]]),
      '5': s([[4,0, 0,0, 0,3, 3,3, 4,4, 4,5, 3,6, 0,6]]),
      '6': s([[4,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5, 4,4, 3,3, 0,3]]),
      '7': s([[0,0, 4,0, 1,6]]),
      '8': s([[1,3, 0,2, 0,1, 1,0, 3,0, 4,1, 4,2, 3,3, 1,3, 0,4, 0,5, 1,6, 3,6, 4,5, 4,4, 3,3]]),
      '9': s([[0,6, 3,6, 4,5, 4,1, 3,0, 1,0, 0,1, 0,2, 1,3, 4,3]]),
      '.': s([[1.5,6, 2.5,6]]),
      ',': s([[2,5.5, 1,7]]),
      ':': s([[2,1.5, 2,2.5], [2,4.5, 2,5.5]]),
      ';': s([[2,1.5, 2,2.5], [2,5, 1,6.5]]),
      '!': s([[2,0, 2,4], [1.5,6, 2.5,6]]),
      '?': s([[0,1, 1,0, 3,0, 4,1, 4,2, 2,3, 2,4], [1.5,6, 2.5,6]]),
      // the at sign, the same shape as in AtariVectorFont: a box open at the lower right, the right
      // side bending in along the bottom of an inner box (the a) and up around it — one stroke
      '@': s([[4,6, 0,6, 0,0, 4,0, 4,4, 1,4, 1,2, 3,2, 3,4]]),
      '-': s([[1,3, 3,3]]),
      '+': s([[2,1, 2,5], [0,3, 4,3]]),
      '=': s([[0,2, 4,2], [0,4, 4,4]]),
      '/': s([[0,6, 4,0]]),
      '\\': s([[0,0, 4,6]]),
      '(': s([[3,0, 2,1, 2,5, 3,6]]),
      ')': s([[1,0, 2,1, 2,5, 1,6]]),
      // braces: the parentheses with the point as a two-stroke beak at mid-height
      '{': s([[3,0, 2,1, 2,2.5, 1,3, 2,3.5, 2,5, 3,6]]),
      '}': s([[1,0, 2,1, 2,2.5, 3,3, 2,3.5, 2,5, 1,6]]),
      // the bar broken in the middle, as the old terminals drew it, so it is not an I
      '|': s([[2,0, 2,2.5], [2,3.5, 2,6]]),
      // the tilde: a wave at mid-height, up - down - up
      '~': s([[0,3.5, 1,2.5, 2,3, 3,3.5, 4,2.5]]),
      // the caret: a roof in the upper half of the cell
      '^': s([[0.5,2, 2,0, 3.5,2]]),
      '[': s([[3,0, 1,0, 1,6, 3,6]]),
      ']': s([[1,0, 3,0, 3,6, 1,6]]),
      '<': s([[4,0, 0,3, 4,6]]),
      '>': s([[0,0, 4,3, 0,6]]),
      '\'': s([[2,0, 2,2]]),
      // the backtick: a stroke as long as the apostrophe (2: a 3-4-5 triangle at 0.4), leaning down to the right
      '`': s([[1.4,0, 2.6,1.6]]),
      '"': s([[1,0, 1,2], [3,0, 3,2]]),
      '*': s([[2,1, 2,5], [0,2, 4,4], [4,2, 0,4]]),
      '_': s([[0,6, 4,6]]),
      '#': s([[1,0, 1,6], [3,0, 3,6], [0,2, 4,2], [0,4, 4,4]]),
      '%': s([[0,6, 4,0], [0,0, 1,0, 1,1, 0,1, 0,0], [3,5, 4,5, 4,6, 3,6, 3,5]]),
      // the dollar: the S half a unit shorter at the top and the bottom, with a vertical bar
      // through it half a unit above and below the capital height
      '$': s([[4,1.5, 3,0.5, 1,0.5, 0,1.5, 0,2.5, 1,3, 3,3, 4,3.5, 4,4.5, 3,5.5, 1,5.5, 0,4.5], [2,-0.5, 2,6.5]]),
      '&': s([[4,6, 0,2, 0,1, 1,0, 2,0, 3,1, 3,2, 0,4, 0,5, 1,6, 2,6, 4,3]]),
      '©': {strokes: [[3,2, 2,1.5, 1,2.5, 1,3.5, 2,4.5, 3,4]], circles: [[2,3, 3]]},
      // (P) and (R): the circle of the (C) with the letter inside, the P half the size of the font's P
      '℗': {strokes: [[1,4.5, 1,1.5, 2.5,1.5, 3,2, 3,2.5, 2.5,3, 1,3]], circles: [[2,3, 3]]},
      '®': {strokes: [[1,4.5, 1,1.5, 2.5,1.5, 3,2, 3,2.5, 2.5,3, 1,3], [1.75,3, 3,4.5]], circles: [[2,3, 3]]}
    };
  } // glyphs

} // VectorFont4x6
