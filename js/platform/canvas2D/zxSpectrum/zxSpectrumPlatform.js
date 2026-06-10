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

export class ZXSpectrumPlatform extends Canvas2DPlatform {
  
  constructor() {
    super();
  } // constructor

  platformName() {
    return 'ZX Spectrum [HTML canvas 2D]';
  } // platformName

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

  newLayout(app) {
    return new ZXSpectrumLayout(app);
  } // newLayout

  desktop(app) {
    return {width: 256, height: 192, defaultColor: ZXColor.white};
  } // desktop

  border(app) {
    return {minimal: 8, defaultColor: ZXColor.white};
  } // border

} // ZXSpectrumPlatform

export default ZXSpectrumPlatform;
