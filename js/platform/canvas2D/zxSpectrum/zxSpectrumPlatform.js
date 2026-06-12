/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { ZXSpectrumLayout } = await import('./zxSpectrumLayout.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import ZXSpectrumLayout from './zxSpectrumLayout.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * Canvas 2D platform definition for the ZX Spectrum. It supplies the platform
 * name, desktop and border characteristics, the matching layout and the
 * Spectrum-specific button hover/click colour palette.
 */
export class ZXSpectrumPlatform extends Canvas2DPlatform {

  /**
   * Creates the ZX Spectrum platform instance.
   */
  constructor() {
    super();
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'ZX Spectrum [HTML canvas 2D]';
  } // platformName

  /**
   * Initialises the canvas element and sets up the ZX Spectrum button hover and
   * click colour palette, including the special case for black.
   * @param {Object} app - The application instance.
   * @param {string} parentElementID - The id of the parent DOM element to host the canvas.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);
    
    app.stack.flashState = false;
    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    ZXColor.colorsNames.forEach((name, i) => {
      var color = ZXColor[name];
      app.stack.ButtonEntity.clickColor[color] = '#7a7a7aff';
      app.stack.ButtonEntity.hoverColor[color] = ZXColor[ZXColor.colorsNames[(i+8)%16]];
    });
    // black and brightBlack are both #000000, so toggling would be invisible
    app.stack.ButtonEntity.hoverColor[ZXColor.black] = '#3d3d3dff';
  } // initCanvasElement

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {ZXSpectrumLayout} A new ZX Spectrum layout.
   */
  newLayout(app) {
    return new ZXSpectrumLayout(app);
  } // newLayout

  /**
   * Returns the ZX Spectrum desktop dimensions and default colour.
   * @param {Object} app - The application instance.
   * @returns {Object} The desktop descriptor with width, height and defaultColor.
   */
  desktop(app) {
    return {width: 256, height: 192, defaultColor: ZXColor.white};
  } // desktop

  /**
   * Returns the ZX Spectrum border configuration.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: 8, defaultColor: ZXColor.white};
  } // border

} // ZXSpectrumPlatform

export default ZXSpectrumPlatform;
