const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { AbstractVectorFont } = await import('./abstractVectorFont.js?ver='+window.srcVersion);
const { VectorDisplayList } = await import('./vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * A text run on the vector platform: the glyphs of a {@link AbstractVectorFont} as
 * polylines in the entity's display list — what a player of a vector game
 * sees, as opposed to the `text` primitive of the list, which is the
 * browser's font (debug output, data views).
 *
 * The run is placed inside the entity's rectangle by `align` ('left',
 * 'center', 'right' — the option of the canvas 2D TextEntity; 'justify'
 * has no meaning on a run of strokes and centres) and vertically centred;
 * `anchor` is the same option under its old name. A `\n` in the text starts
 * a new line, the block of lines is centred as a whole. `rotation` turns
 * the text by 90, 180 or 270 degrees anticlockwise as in the canvas 2D
 * TextEntity: the lines are laid out along the entity's height for 90
 * (bottom to top) and 270 (top to bottom), and `align` then runs along
 * that side — a credit written down the edge of the screen. The list is
 * rebuilt when the text, the colour or the intensity change, so the layout
 * re-emits the markup only then. The list is not clipped to the rectangle
 * — a label is small and its box is a place, not a window.
 *
 * Options: `font` (default the application's `fonts.vector`), `size`
 * (height of a capital; default the entity's height), `spacing` (extra gap
 * between cells in grid units), `lineSpacing` (extra gap between lines in
 * grid units, under the descent), `intensity` (0-15), `align`,
 * `strokeWidth`, `rotation`.
 */
export class VectorTextEntity extends VectorEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string|false} penColor - Colour of the strokes.
   * @param {string|false} bkColor - Background, or false for none.
   * @param {string} text
   * @param {Object} [options]
   */
  constructor(parentEntity, x, y, width, height, penColor, bkColor, text, options) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'VectorTextEntity';
    this.text = String(text);
    this.options = Object.assign({
      font: false,
      size: height,
      spacing: 0,
      lineSpacing: 2,
      intensity: 15,
      align: 'left',
      strokeWidth: false,
      rotation: 0             // 0, 90 (bottom to top), 180 (upside down), 270 (top to bottom), anticlockwise
    }, options || {});
    if (options && options.anchor && !options.align) {
      this.options.align = options.anchor;      // the old name of the option
    }
    if (this.options.font === false) {
      // no built-in font: the application's (R-063), the way the raster entities get theirs
      this.options.font = AbstractVectorFont.ofApp(this.app);
    }
    this.clipsList = false;
  } // constructor

  /**
   * Builds the list for the first time.
   */
  init() {
    super.init();
    this.cleanCache();
  } // init

  /**
   * Rebuilds the list: `setText` and `setPenColor` of the base class call
   * this when something changed.
   */
  cleanCache() {
    var o = this.options;
    var width = this.layoutWidth(), height = this.layoutHeight();
    var x = 0;
    var anchor = 'start';
    if (o.align == 'center' || o.align == 'justify') {
      x = width/2;
      anchor = 'middle';
    } else if (o.align == 'right') {
      x = width;
      anchor = 'end';
    }
    var lines = this.lines();
    var pitch = this.linePitch();
    var y = Math.max(0, (height-(o.size+(lines.length-1)*pitch))/2);
    var style = {size: o.size, spacing: o.spacing, anchor: anchor, intensity: o.intensity};
    if (this.penColor) {
      style.color = this.penColor;
    }
    if (o.strokeWidth !== false) {
      style.strokeWidth = o.strokeWidth;
    }
    // laid out along the line, then turned into the entity's frame
    var laid = new VectorDisplayList();
    lines.forEach((line, i) => { o.font.draw(laid, x, y+i*pitch, line, style); });
    this.list.clear();
    this.list.appendRotated(laid, o.rotation, this.width, this.height);
  } // cleanCache

  /**
   * The lines of the text.
   * @returns {string[]}
   */
  lines() {
    return this.text.split('\n');
  } // lines

  /**
   * The distance between the tops of two lines in model units: the capital,
   * the descent and `lineSpacing`.
   * @returns {number}
   */
  linePitch() {
    var m = this.options.font.metrics;
    return this.options.size*(m.height+(m.descent || 0)+this.options.lineSpacing)/m.height;
  } // linePitch

  /**
   * The width the text is laid out in: along the line, so the height of the
   * entity when the text is turned by a quarter (`rotation` 90 or 270).
   * @returns {number}
   */
  layoutWidth() {
    return this.options.rotation % 180 ? this.height : this.width;
  } // layoutWidth

  /**
   * The height the text is laid out in: across the lines (see layoutWidth).
   * @returns {number}
   */
  layoutHeight() {
    return this.options.rotation % 180 ? this.width : this.height;
  } // layoutHeight

  /**
   * Changes the beam intensity of the run.
   * @param {number} intensity - 0-15
   */
  setIntensity(intensity) {
    if (this.options.intensity != intensity) {
      this.options.intensity = intensity;
      this.cleanCache();
    }
  } // setIntensity

  /**
   * The width of the current text in model units: the widest line, along the line.
   * @returns {number}
   */
  textWidth() {
    var o = this.options;
    return Math.max.apply(null, this.lines().map((line) => o.font.textWidth(line, o.size, o.spacing)));
  } // textWidth

} // VectorTextEntity
