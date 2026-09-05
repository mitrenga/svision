/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
/**/
// begin code

/**
 * Canvas 2D layout for the ZX Spectrum platform. It computes the integer
 * scaling ratio and border sizes that fit the Spectrum desktop into the
 * available element, and provides coordinate conversion and rectangle painting.
 */
export class ZXSpectrumLayout extends Canvas2DLayout {

  /**
   * Creates the ZX Spectrum layout for the given application.
   * @param {Object} app - The application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'ZXSpectrumLayout';
  } // constructor

  /**
   * Recomputes the integer scaling ratio, border sizes and canvas dimensions to
   * fit the model's desktop into the element, and repositions the border and
   * desktop entities accordingly.
   * @param {Object} model - The model whose desktop and border geometry is being laid out.
   */
  resizeModel(model) {
    this.ratio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < this.ratio) {
      this.ratio = yRatio;
    }
    if (this.ratio >= 2) {
      this.ratio = Math.floor(this.ratio);
    }
    if (this.ratio < 1) {
      this.ratio = 1;
    }

    model.borderWidth = Math.ceil((this.app.element.clientWidth-model.desktopWidth*this.ratio)/2/this.ratio);
    model.borderHeight = Math.ceil((this.app.element.clientHeight-model.desktopHeight*this.ratio)/2/this.ratio);

    this.ratio = Math.floor(this.ratio);

    this.app.element.width = Math.round((model.desktopWidth+2*model.borderWidth)*this.ratio);
    this.app.element.height = Math.round((model.desktopHeight+2*model.borderHeight)*this.ratio);
    this.applyDisplayStyle();

    model.borderEntity.x = 0;
    model.borderEntity.y = 0;
    model.borderEntity.width = model.desktopWidth+2*model.borderWidth;
    model.borderEntity.height = model.desktopHeight+2*model.borderHeight;
    model.borderEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.borderEntity.parentHeight = model.desktopHeight+2*model.borderHeight;

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.desktopEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
  } // resizeModel

} // ZXSpectrumLayout

export default ZXSpectrumLayout;
