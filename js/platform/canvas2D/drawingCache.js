/**/

/*/

/**/
// begin code

/**
 * An off-screen canvas used to cache an entity's rendered output so it can be
 * blitted to the main canvas without re-rendering each frame. The cache always
 * holds the entity in its native (logical) resolution; scaling by the layout
 * ratio happens only when the cache is blitted to the screen. A dirty flag and
 * a dimension check decide when the cache must be refreshed.
 */
export class DrawingCache {

  /**
   * Creates a drawing cache backed by an off-screen canvas.
   * @param {Object} app - The application instance owning this cache.
   */
  constructor(app) {
    this.app = app;
    this.id = 'DrawingCache';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.clean = false;
  } // constructor

  /**
   * Sizes the off-screen canvas to the given logical dimensions and clears it.
   * @param {number} width - Cache width in model coordinates.
   * @param {number} height - Cache height in model coordinates.
   */
  init(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  } // init

  /**
   * Clears the cached canvas and marks the cache as dirty so it will be redrawn.
   */
  cleanCache() {
    this.clean = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  } // cleanCache

  /**
   * Prepares the cache for painting: reinitializes the canvas when the required
   * dimensions changed and consumes the dirty flag. Callers paint the content
   * only when this returns true, otherwise the cached image is still valid.
   * @param {number} width - Required width in model coordinates.
   * @param {number} height - Required height in model coordinates.
   * @returns {boolean} True if the cache content must be painted, otherwise false.
   */
  preparePaint(width, height) {
    if (this.canvas.width != width || this.canvas.height != height) {
      this.init(width, height);
      return true;
    }
    if (this.clean) {
      this.clean = false;
      return true;
    }
    return false;
  } // preparePaint

  /**
   * Paints a rectangle into this cache's off-screen context. The cache is kept
   * in logical resolution, so coordinates are used as-is without ratio scaling.
   * @param {number} x - X position in model coordinates.
   * @param {number} y - Y position in model coordinates.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(x, y, width, height, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  } // paint

} // DrawingCache

export default DrawingCache;
