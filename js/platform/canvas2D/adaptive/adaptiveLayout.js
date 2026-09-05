/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
/**/
// begin code

/**
 * A canvas 2D layout that adapts the model resolution to the actual element
 * size, choosing an integer scale ratio from the element width so the logical
 * desktop width stays close to the configured `desktopWidth`; the logical height
 * then follows from that same ratio (so portrait screens get a taller desktop).
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
    // Optimize the scale for width only; height then follows from the same ratio.
    var elementSize = this.app.element.clientWidth;
    while (elementSize/this.ratio > model.desktopWidth) {
      this.ratio++;
    }
    
    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;
    this.applyDisplayStyle();

    model.desktopEntity.x = 0;
    model.desktopEntity.y = 0;
    model.desktopEntity.width = Math.ceil(this.app.element.clientWidth/this.ratio);
    model.desktopEntity.height = Math.ceil(this.app.element.clientHeight/this.ratio);
    model.desktopEntity.parentWidth = model.desktopEntity.width;
    model.desktopEntity.parentHeight = model.desktopEntity.height;
  } // resizeModel

} // AdaptiveLayout

export default AdaptiveLayout;
