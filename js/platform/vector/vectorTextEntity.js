const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorFont } = await import('./vectorFont.js?ver='+window.srcVersion);
// begin code

/**
 * A text run on the vector platform: the glyphs of a {@link VectorFont} as
 * polylines in the entity's display list — what a player of a vector game
 * sees, as opposed to the `text` primitive of the list, which is the
 * browser's font (debug output, data views).
 *
 * The run is placed inside the entity's rectangle by `align` ('left',
 * 'center', 'right' — the option of the canvas 2D TextEntity; 'justify'
 * has no meaning on a run of strokes and centres) and vertically centred;
 * `anchor` is the same option under its old name. The list is rebuilt when the
 * text, the colour or the intensity change, so the layout re-emits the
 * markup only then. The list is not clipped to the rectangle — a label is
 * small and its box is a place, not a window.
 *
 * Options: `font` (default the built-in font), `size` (height of a capital;
 * default the entity's height), `spacing` (extra gap in grid units),
 * `intensity` (0-15), `align`, `strokeWidth`.
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
      intensity: 15,
      align: 'left',
      strokeWidth: false
    }, options || {});
    if (options && options.anchor && !options.align) {
      this.options.align = options.anchor;      // the old name of the option
    }
    if (this.options.font === false) {
      this.options.font = VectorFont.simple();
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
    var x = 0;
    var anchor = 'start';
    if (o.align == 'center' || o.align == 'justify') {
      x = this.width/2;
      anchor = 'middle';
    } else if (o.align == 'right') {
      x = this.width;
      anchor = 'end';
    }
    var y = Math.max(0, (this.height-o.size)/2);
    var style = {size: o.size, spacing: o.spacing, anchor: anchor, intensity: o.intensity};
    if (this.penColor) {
      style.color = this.penColor;
    }
    if (o.strokeWidth !== false) {
      style.strokeWidth = o.strokeWidth;
    }
    this.list.clear();
    o.font.draw(this.list, x, y, this.text, style);
  } // cleanCache

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
   * The width of the current text in model units.
   * @returns {number}
   */
  textWidth() {
    return this.options.font.textWidth(this.text, this.options.size, this.options.spacing);
  } // textWidth

} // VectorTextEntity
