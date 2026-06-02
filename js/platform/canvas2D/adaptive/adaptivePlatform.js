/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { AdaptiveLayout } = await import('./adaptiveLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import AdaptiveLayout from './adaptiveLayout.js';
/**/
// begin code

export class AdaptivePlatform extends Canvas2DPlatform {
  
  constructor(optSize, defaultColor) {
    super();
    this.optSize = optSize;
    this.defaultColor = defaultColor;
  } // constructor

  platformName() {
    return 'Adaptive [HTML canvas 2D]';
  } // platformName

  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);
    
/*    app.stack.flashState = false;
    var buttonClickColor = '#7a7a7aff';
    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    app.stack.ButtonEntity.clickColor[this.colorByName('black')] = buttonClickColor;
    app.stack.ButtonEntity.hoverColor[this.colorByName('black')] = '#3d3d3dff';
    */
  } // initCanvasElement

  newLayout(app) {
    return new AdaptiveLayout(app);
  } // newLayout

  desktop(app) {
    return {width: this.optSize, height: this.optSize, defaultColor: this.defaultColor};
  } // desktop

  border(app) {
    return false;
  } // border

} // AdaptivePlatform

export default AdaptivePlatform;
