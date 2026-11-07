const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A modal box comparing two {@link AbstractVectorFont}s glyph by glyph: for
 * every printable ASCII character (32-126, whether a font has it or not) and
 * then every character above that either font defines (©, ℗, ®), in the order
 * of the code points, filling the columns top to bottom, ROWS to a column —
 * the first font's glyph, a dash, the second font's glyph.
 * A character a font lacks shows as the hairline box the base class draws,
 * so what is still to be drawn is visible too; nothing else is drawn around
 * a glyph, so the shapes of new glyphs (the lower case of AtariVectorFont)
 * are checked against VectorFont4x6 and the capitals as they are. Closes on
 * Enter, Escape, a click or a tap. A dev
 * tool: the menu of Asteroids opens it from a temporary row FONT GLYPHS
 * while the font is being extended. No title: the glyphs need the room.
 */
export class VectorFontCatalogueEntity extends VectorEntity {

  /** the glyph: height of a capital in model units, and the pitch of the grid */
  static get SIZE() { return 24; }
  static get ROWS() { return 12; }
  /** a column is the two glyphs and the dash (54 wide) plus a gap of 48 */
  static get PITCH_X() { return 102; }
  static get PITCH_Y() { return 52; }
  /** the dash between the two glyphs, and the gap on each side of it */
  static get DASH() { return 10; }
  static get GAP() { return 6; }

  /**
   * The characters shown: all of printable ASCII, plus the characters above
   * it either font has, by code point.
   * @param {AbstractVectorFont[]} fonts
   * @returns {string[]}
   */
  static characters(fonts) {
    var set = {};
    for (var code = 32; code < 127; code++) {
      set[String.fromCharCode(code)] = true;
    }
    fonts.forEach((f) => { Object.keys(f.glyphs).forEach((ch) => { set[ch] = true; }); });
    return Object.keys(set).sort((a, b) => a.codePointAt(0)-b.codePointAt(0));
  } // characters

  /**
   * The number of columns for the fonts.
   * @param {AbstractVectorFont[]} fonts
   * @returns {number}
   */
  static columnsFor(fonts) {
    return Math.ceil(VectorFontCatalogueEntity.characters(fonts).length/VectorFontCatalogueEntity.ROWS);
  } // columnsFor

  /** the top margin over the first row (no title: the glyphs are the title) */
  static get TOP() { return 24; }

  /**
   * The height of the box for the fonts: the top margin, the rows, the hint band.
   * @param {AbstractVectorFont[]} fonts
   * @returns {number}
   */
  static heightFor(fonts) {
    var rows = Math.min(VectorFontCatalogueEntity.ROWS, VectorFontCatalogueEntity.characters(fonts).length);
    return VectorFontCatalogueEntity.TOP+rows*VectorFontCatalogueEntity.PITCH_Y+64;
  } // heightFor

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {AbstractVectorFont[]} fonts - The two fonts compared, left and right (VectorFont4x6, AtariVectorFont); the second one draws the texts of the box.
   * @param {string} [color] - Stroke colour of the frame and the glyphs.
   */
  constructor(parentEntity, x, y, width, fonts, color) {
    super(parentEntity, x, y, width, VectorFontCatalogueEntity.heightFor(fonts), color || '#ffffff', '#000000');
    this.id = 'VectorFontCatalogueEntity';
    this.fonts = fonts;
    this.clipsList = false;
  } // constructor

  init() {
    super.init();
    var w = this.width, h = this.height, fonts = this.fonts, font = fonts[1];
    var C = VectorFontCatalogueEntity;
    var size = C.SIZE, rows = C.ROWS, cols = C.columnsFor(fonts), px = C.PITCH_X, py = C.PITCH_Y;
    // the cell widths of the two fonts at the common capital height
    var cells = fonts.map((f) => ({width: f.metrics.width*size/f.metrics.height}));
    var tripleW = cells[0].width+C.GAP+C.DASH+C.GAP+cells[1].width;

    this.list.rect(0, 0, w, h, {strokeWidth: 3});
    this.list.rect(6, 6, w-12, h-12, {strokeWidth: 1.5, intensity: 8});

    var keys = C.characters(fonts);
    var left = (w-cols*px+(px-tripleW)) >> 1;
    keys.forEach((ch, i) => {
      // down the columns
      var cx = left+Math.floor(i/rows)*px, cy = C.TOP+(i%rows)*py;
      // the first font's glyph, the dash, the second font's glyph
      fonts.forEach((f, k) => {
        var cell = cells[k];
        // the glyph itself, straight from the table (a missing one is the base class's hairline box)
        f.draw(this.list, cx, cy, ch, {size: size, intensity: 15});
        if (k == 0) {
          cx += cell.width+C.GAP;
          this.list.line(cx, cy+size/2, cx+C.DASH, cy+size/2, {strokeWidth: 1.5, intensity: 8});
          cx += C.DASH+C.GAP;
        }
      });
    });

    this.addEntity(new VectorTextEntity(this, 0, h-44, w, 18, this.penColor, false, keys.length+' CHARACTERS - PRESS ENTER', {font: font, size: 18, align: 'center', intensity: 9}));
  } // init

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    switch (event.id) {
      case 'keyPress':
        switch (event.key) {
          case 'Escape':
          case 'GamepadExit':
          case 'Enter':
          case ' ':
          case 'GamepadOK':
          case 'Mouse1':
          case 'Touch':
            this.destroy();
            return true;
        }
        return true;
      case 'keyRelease':
      case 'mouseHover':
        return true;
    }
    return false;
  } // handleEvent

} // VectorFontCatalogueEntity
