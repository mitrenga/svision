/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
/**/
// begin code

/**
 * A canvas 2D layout that adapts the model resolution to the actual element
 * size, choosing an integer scale ratio so the logical desktop stays close to
 * the configured `desktopWidth` while filling the available pixels.
 */
export class AdaptiveLayout extends Canvas2DLayout {

  /**
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AdaptiveLayout';
  } // constructor

  /**
   * Recomputes the integer scale ratio from the element size and resizes the
   * model's desktop entity to the resulting logical dimensions.
   * @param {Object} model - The model whose desktop entity is being resized.
   */
  resizeModel(model) {
    this.ratio = 1;
    var elementSize = this.app.element.clientHeight;
    if (this.app.element.clientWidth > this.app.element.clientHeight) {
      elementSize = this.app.element.clientWidth;
    }
    while (elementSize/this.ratio > model.desktopWidth) {
      this.ratio++;
    }
    
    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;

    model.desktopEntity.x = 0;
    model.desktopEntity.y = 0;
    model.desktopEntity.width = Math.ceil(this.app.element.clientWidth/this.ratio);
    model.desktopEntity.height = Math.ceil(this.app.element.clientHeight/this.ratio);
    model.desktopEntity.parentWidth = model.desktopEntity.width;
    model.desktopEntity.parentHeight = model.desktopEntity.height;
  } // resizeModel

  /**
   * Converts a client (CSS pixel) X coordinate into a logical model X
   * coordinate using the current scale ratio.
   * @param {number} clientX - The client X coordinate.
   * @returns {number} The corresponding logical model X coordinate.
   */
  convertClientCoordinateX(clientX) {
    return Math.round(this.app.element.width/this.ratio/this.app.element.clientWidth*clientX);
  } // convertClientCoordinateX

  /**
   * Converts a client (CSS pixel) Y coordinate into a logical model Y
   * coordinate using the current scale ratio.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding logical model Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round(this.app.element.height/this.ratio/this.app.element.clientHeight*clientY);
  } // convertClientCoordinateY

} // AdaptiveLayout

export default AdaptiveLayout;
