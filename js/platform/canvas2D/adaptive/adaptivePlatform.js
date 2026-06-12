/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { AdaptiveLayout } = await import('./adaptiveLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import AdaptiveLayout from './adaptiveLayout.js';
/**/
// begin code

/**
 * A canvas 2D platform that produces an adaptively sized desktop, using an
 * optimal target size and a default background color and pairing the canvas
 * with an `AdaptiveLayout`.
 */
export class AdaptivePlatform extends Canvas2DPlatform {

  /**
   * @param {number} optSize - The optimal (target) logical desktop size.
   * @param {string|boolean} defaultColor - The default desktop background color.
   */
  constructor(optSize, defaultColor) {
    super();
    this.optSize = optSize;
    this.defaultColor = defaultColor;
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'Adaptive [HTML canvas 2D]';
  } // platformName

  /**
   * Initializes the canvas element for the application via the parent
   * implementation.
   * @param {Object} app - The owning application instance.
   * @param {string} parentElementID - The id of the parent DOM element.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);
    
/*    app.stack.flashState = false;
    var buttonClickColor = '#7a7a7aff';
    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    app.stack.ButtonEntity.clickColor[this.colorByName('black')] = buttonClickColor;
    app.stack.ButtonEntity.hoverColor[this.colorByName('black')] = '#3d3d3dff';
    */
  } // initCanvasElement

  /**
   * Creates the layout used by this platform.
   * @param {Object} app - The owning application instance.
   * @returns {AdaptiveLayout} A new adaptive layout bound to the app.
   */
  newLayout(app) {
    return new AdaptiveLayout(app);
  } // newLayout

  /**
   * Returns the desktop descriptor (dimensions and default color) for this
   * platform.
   * @param {Object} app - The owning application instance.
   * @returns {Object} An object with `width`, `height`, and `defaultColor`.
   */
  desktop(app) {
    return {width: this.optSize, height: this.optSize, defaultColor: this.defaultColor};
  } // desktop

  /**
   * Indicates whether this platform renders a border around the desktop.
   * @param {Object} app - The owning application instance.
   * @returns {boolean} Always false for this platform.
   */
  border(app) {
    return false;
  } // border

} // AdaptivePlatform

export default AdaptivePlatform;
