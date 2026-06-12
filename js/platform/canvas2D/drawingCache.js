/**/

/*/

/**/
// begin code

/**
 * An off-screen canvas used to cache an entity's rendered output so it can be
 * blitted to the main canvas without re-rendering each frame. Tracks the layout
 * ratio and a dirty flag to decide when the cache must be refreshed.
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
    this.ratio = 0;
    this.clean = false;
  } // constructor
  
  /**
   * Sizes the off-screen canvas to the given dimensions scaled by the layout ratio
   * and clears it.
   * @param {number} width - Cache width in model coordinates.
   * @param {number} height - Cache height in model coordinates.
   */
  init(width, height) {
    this.ratio = this.app.layout.ratio;
    this.canvas.width = width*this.ratio;
    this.canvas.height = height*this.ratio;
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
   * Determines whether the cache needs to be redrawn, reinitializing it when the
   * ratio or dimensions changed and clearing the dirty flag.
   * @param {AbstractEntity} entity - The entity owning this cache (unused for sizing here).
   * @param {number} width - Required width in model coordinates.
   * @param {number} height - Required height in model coordinates.
   * @returns {boolean} True if the cache must be redrawn, otherwise false.
   */
  needToRefresh(entity, width, height) {
    if (this.ratio != this.app.layout.ratio || this.canvas.width != width*this.ratio || this.canvas.height != height*this.ratio) {
      this.init(width, height);
      return true;
    }
    if (this.clean) {
      this.clean = false;
      return true;
    }
    return false;
  } // needRefresh

  /**
   * Paints a rectangle into this cache's off-screen context.
   * @param {number} x - X position in model coordinates.
   * @param {number} y - Y position in model coordinates.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(x, y, width, height, color) {
    this.app.layout.paintRect(this.ctx, x, y, width, height, color);
  } // paint

} // DrawingCache

export default DrawingCache;
