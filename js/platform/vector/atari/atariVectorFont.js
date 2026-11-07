const { AbstractVectorFont } = await import('../abstractVectorFont.js?ver='+window.srcVersion);
// begin code

/**
 * The vector font of Atari's XY machines, for the menu and the dialogs of
 * their remakes (notices, volume, player name, hall of fame, about,
 * settings): the glyphs the vector ROMs of Asteroids (JSRL table $56D4,
 * disasm_notes 2.4) and Battlezone (JSRL table $33F0, disasm_notes 6)
 * share — the same SVEC strokes, Battlezone's at twice the unit — as one
 * hand-editable table, plus the characters the remakes need and the ROMs
 * never had (punctuation, lower case, drawn in the same style on the
 * 2-unit grid of the SVECs). Both remakes draw from this one table, so a
 * glyph added here appears in both.
 *
 * The games themselves draw their texts from their own data/font.json
 * (rom2vectors) through the DVG or the AVG at the machine's scale: the
 * ROM's glyphs stay the ROM's. This table started as a copy of that JSON
 * and is maintained by hand from then on — add a glyph here when a text
 * needs it; a character the table lacks is drawn as a box (no fallback
 * font).
 *
 * A glyph is a list of polylines `[x, y, x, y, ...]` in grid units: x 0..8
 * (the cell is 8 wide, 12 with the gap), y 0 (top of a capital) .. 12
 * (baseline), a descender goes to 14. A lower case letter without a glyph
 * of its own draws as its capital (AbstractVectorFont.glyph).
 *
 * A subclass of {@link AbstractVectorFont} with the table, as the raster fonts are
 * subclasses of AbstractFonts; the application makes its instance
 * (`fonts.vector = new AtariVectorFont()`).
 */
export class AtariVectorFont extends AbstractVectorFont {

  /** the cell: 8x12, advance 12 (one glyph plus the gap), descenders 2 below the baseline */
  static get METRICS() { return {width: 8, height: 12, advance: 12, descent: 2}; }

  constructor() {
    super(AtariVectorFont.glyphs(), AtariVectorFont.METRICS);
  } // constructor

  /**
   * The glyph table in the AbstractVectorFont form (`{strokes}`).
   * @returns {Object}
   */
  static glyphs() {
    var table = AtariVectorFont.strokes();
    var out = {};
    Object.keys(table).forEach((ch) => { out[ch] = {strokes: table[ch]}; });
    return out;
  } // glyphs

  /**
   * The strokes, keyed by character. The ROMs' glyphs first (space, 0-9,
   * A-Z, (C), (P), the dash; 0 = O and 5 = S share a subroutine there),
   * then the remakes' ((R) from the (P), punctuation).
   * @returns {Object}
   */
  static strokes() {
    return {
      // ---- the ROM's glyphs (tools/rom2vectors -> data/font.json of either game;
      // Asteroids' table at $56D4 has no (P) and the dash, Battlezone's at $33F0 has them)
      ' ': [],
      '0': [[0,12,0,0,8,0,8,12,0,12]],
      '1': [[4,12,4,0]],
      '2': [[0,0,8,0,8,6,0,6,0,12,8,12]],
      '3': [[0,12,8,12,8,0,0,0], [0,6,8,6]],
      '4': [[0,0,0,6,8,6], [8,0,8,12]],
      '5': [[0,12,8,12,8,6,0,6,0,0,8,0]],
      '6': [[0,6,8,6,8,12,0,12,0,0]],
      '7': [[0,0,8,0,8,12]],
      '8': [[0,12,8,12,8,0,0,0,0,12], [0,6,8,6]],
      '9': [[8,12,8,0,0,0,0,6,8,6]],
      'A': [[0,12,0,4,4,0,8,4,8,12], [0,8,8,8]],
      'B': [[0,12,0,0,6,0,8,2,8,4,6,6,0,6], [6,6,8,8,8,10,6,12,0,12]],
      'C': [[0,12,0,0,8,0], [0,12,8,12]],
      'D': [[0,12,0,0,4,0,8,4,8,8,4,12,0,12]],
      'E': [[0,12,0,0,8,0], [6,6,0,6], [0,12,8,12]],
      'F': [[0,12,0,0,8,0], [6,6,0,6]],
      'G': [[0,12,0,0,8,0,8,4], [4,8,8,8,8,12,0,12]],
      'H': [[0,12,0,0], [0,6,8,6], [8,0,8,12]],
      'I': [[0,12,8,12], [4,12,4,0], [8,0,0,0]],
      'J': [[0,8,4,12,8,12,8,0]],
      'K': [[0,12,0,0], [6,0,0,6,6,12]],
      'L': [[0,0,0,12,8,12]],
      'M': [[0,12,0,0,4,4,8,0,8,12]],
      'N': [[0,12,0,0,8,12,8,0]],
      'O': [[0,12,0,0,8,0,8,12,0,12]],
      'P': [[0,12,0,0,8,0,8,6,0,6]],
      'Q': [[0,12,0,0,8,0,8,8,4,12,0,12], [4,8,8,12]],
      'R': [[0,12,0,0,8,0,8,6,0,6], [2,6,8,12]],
      'S': [[0,12,8,12,8,6,0,6,0,0,8,0]],
      'T': [[4,12,4,0], [0,0,8,0]],
      'U': [[0,0,0,12,8,12,8,0]],
      'V': [[0,0,4,12,8,0]],
      'W': [[0,0,0,12,4,8,8,12,8,0]],
      'X': [[0,12,8,0], [0,0,8,12]],
      'Y': [[4,12,4,4,0,0], [8,0,4,4]],
      'Z': [[0,0,8,0,0,12,8,12]],


      // ---- the remake's glyphs (the ROM has no punctuation)
      '©': [[0,10,0,2,4,0,8,2,8,10,4,12,0,10], [5.5,9.5,2.5,9.5,2.5,2.5,5.5,2.5]],
      '℗': [[0,10,0,2,4,0,8,2,8,10,4,12,0,10], [2.5,9.5,2.5,2.5,5.5,2.5,5.5,5.5,2.5,5.5]],
      // the remake's (R): the ROM's (P) with the leg of the R added
      '®': [[0,10,0,2,4,0,8,2,8,10,4,12,0,10], [2.5,9.5,2.5,2.5,5.5,2.5,5.5,5.5,2.5,5.5], [3.5,5.5,5.5,9.5]],
      // the ROM draws its dash on the baseline (Battlezone under GAME OVER); here that is the
      // underscore, the dash sits mid-height so that BY-NC-SA reads as a dash
      '_': [[0,12,8,12]],
      '-': [[0,6,8,6]],
      '.': [[3,10,5,10,5,12,3,12,3,10]],
      ',': [[3,10,5,10,5,12,3,12,3,10], [5,12,3,14]],
      ':': [[3,3,5,3,5,5,3,5,3,3], [3,9,5,9,5,11,3,11,3,9]],
      ';': [[3,3,5,3,5,5,3,5,3,3], [3,9,5,9,5,11,3,11,3,9], [5,11,3,13]],
      '!': [[4,0,4,8], [3,10,5,10,5,12,3,12,3,10]],
      '?': [[0,2,0,0,8,0,8,6,4,6,4,8], [3,10,5,10,5,12,3,12,3,10]],
      // the at sign: a box open at the lower right, the right side bending in along the bottom
      // of an inner box (the a) and up around it — one stroke:
      //   ########  #......#  #.####.#  #.#..#.#  #.######  #.......  ########
      '@': [[8,12,0,12,0,0,8,0,8,8,2,8,2,4,6,4,6,8]],
      '%': [[0,12,8,0], [0,0,3,0,3,3,0,3,0,0], [5,9,8,9,8,12,5,12,5,9]],
      // the ampersand: two diamonds as a figure of eight (one closed stroke, edges at 45 degrees)
      // and the tail at the lower right on the lines of the lower diamond's right edges
      '&': [[3,0, 0,3, 3,6, 0,9, 3,12, 6,9, 3,6, 6,3, 3,0], [8,7, 6,9, 8,11]],
      // the dollar: the ROM's S a unit shorter at the top and the bottom, with a vertical bar
      // through it a unit above and below the capital height
      '$': [[0,11,8,11,8,6,0,6,0,1,8,1], [4,-1,4,13]],
      // the hash: the 4x6 font's at twice the unit
      '#': [[2,0,2,12], [6,0,6,12], [0,4,8,4], [0,8,8,8]],
      '=': [[0,4,8,4], [0,8,8,8]],
      '+': [[4,2,4,10], [0,6,8,6]],
      '*': [[4,2,4,10], [0.5,4,7.5,8], [7.5,4,0.5,8]],
      '/': [[0,12,8,0]],
      '\\': [[0,0,8,12]],
      // square brackets: the 4x6 font's at twice the unit
      '[': [[6,0,2,0,2,12,6,12]],
      ']': [[2,0,6,0,6,12,2,12]],
      '(': [[6,0,2,2,2,10,6,12]],
      ')': [[2,0,6,2,6,10,2,12]],
      // braces: the parentheses a unit narrower, the point replaced by a dash at mid-height
      '{': [[6,0,3,2,3,10,6,12], [3,6,1,6]],
      '}': [[2,0,5,2,5,10,2,12], [5,6,7,6]],
      // the bar broken in the middle, as the old terminals drew it, so it is not an I
      '|': [[4,0,4,5], [4,7,4,12]],
      // the tilde: a square wave at mid-height, in the angular manner of the ROM
      '~': [[0,7,0,5,4,5,4,7,8,7,8,5]],
      // the caret: a roof in the upper half of the cell
      '^': [[1,4,4,0,7,4]],
      '<': [[6,0,2,6,6,12]],
      '>': [[2,0,6,6,2,12]],
      '\'': [[4,0,4,3]],
      // the backtick: a stroke as long as the apostrophe (3: a 3-4-5 triangle at 0.6), leaning down to the right
      '`': [[3.1,0,4.9,2.4]],
      '"': [[2.5,0,2.5,3], [5.5,0,5.5,3]]
    };
  } // strokes

} // AtariVectorFont
