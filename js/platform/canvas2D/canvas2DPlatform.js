/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import Canvas2DLayout from './canvas2DLayout.js';
/**/
// begin code

export class Canvas2DPlatform extends AbstractPlatform {
  
  constructor() {
    super();
  } // constructor

  platformName() {
    return 'HTML canvas 2D';
  } // platformName
  
  initCanvasElement(app, parentElementID) {
    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('canvas');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.element.style.cursor = 'pointer';
    app.parentElement.appendChild(app.element);
    app.stack.ctx = app.element.getContext('2d');
    app.stack.containerType = 'canvas2D';
  } // initCanvasElement

  newLayout(app) {
    return new Canvas2DLayout(app);
  } // newLayout

  desktop(app) {
    return {'width': app.element.clientWidth, 'height': app.element.clientHeight, 'defaultColor': false};
  } // desktop

} // class Canvas2DPlatform

export default Canvas2DPlatform;
