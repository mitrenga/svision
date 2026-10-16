const { VectorLayout } = await import('./vectorLayout.js?ver='+window.srcVersion);
const { VectorDisplayList } = await import('./vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * The vector layout without a DOM: what the browser layout would put into
 * the `<svg>`, collected into one {@link VectorDisplayList} in model units
 * instead. A tool under Node draws a model through it and reads `markup()`
 * — the same string, element for element, that the retained layout emits
 * for the same tree — so a screen has a fingerprint (`regress*`) and a
 * `match*` tool has something to diff against a dump of the original.
 *
 * The element size is pretended (`clientWidth`, `clientHeight`), so the
 * border fits the same way as on a real element of that size.
 */
export class VectorHeadlessLayout extends VectorLayout {

  /**
   * @param {Object} app - A stand-in application (`platform`, `stack`; see tools/headlessApp.mjs).
   * @param {number} clientWidth - The pretended element width in CSS pixels.
   * @param {number} clientHeight - The pretended element height in CSS pixels.
   */
  constructor(app, clientWidth, clientHeight) {
    super(app);
    this.id = 'VectorHeadlessLayout';
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;
    this.list = new VectorDisplayList();
  } // constructor

  /**
   * Fits the model into the pretended element.
   * @param {AbstractModel} model
   */
  resizeModel(model) {
    this.fitModel(model, this.clientWidth, this.clientHeight);
  } // resizeModel

  /**
   * Starts a frame: forgets the previous one.
   */
  clearCanvas() {
    this.list = new VectorDisplayList();
  } // clearCanvas

  /**
   * A filled rectangle of an entity (its background).
   * @param {AbstractEntity} entity - The entity providing the coordinate origin.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(entity, x, y, width, height, color) {
    this.list.rect(entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, {color: 'none', fill: color, strokeWidth: 0});
  } // paint

  /**
   * An entity's display list, translated to the entity. The clip of the
   * browser layout is a `<clipPath>` reference, not geometry, so it does not
   * appear here.
   * @param {AbstractEntity} entity - The entity owning the list.
   * @param {VectorDisplayList} list - The primitives to draw.
   */
  paintDisplayList(entity, list) {
    this.list.append(list, entity.parentX+entity.x, entity.parentY+entity.y);
  } // paintDisplayList

  /**
   * The frame as SVG elements, one per line.
   * @returns {string}
   */
  markup() {
    return this.list.markup();
  } // markup

  /**
   * The frame as a stand-alone SVG document of the viewBox size.
   * @param {string|false} [background] - Fill behind everything, default the platform's.
   * @returns {string}
   */
  toSVG(background) {
    if (background === undefined) {
      background = this.app.platform.options ? this.app.platform.options.background : false;
    }
    return this.list.toSVG({width: this.viewBox.width, height: this.viewBox.height, background: background});
  } // toSVG

  /**
   * Model units from pretended client coordinates.
   * @param {number} clientX - The client X coordinate.
   * @returns {number} The corresponding model X coordinate.
   */
  convertClientCoordinateX(clientX) {
    return Math.round((clientX-this.offsetX)/this.ratio);
  } // convertClientCoordinateX

  /**
   * Model units from pretended client coordinates.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding model Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round((clientY-this.offsetY)/this.ratio);
  } // convertClientCoordinateY

} // VectorHeadlessLayout
