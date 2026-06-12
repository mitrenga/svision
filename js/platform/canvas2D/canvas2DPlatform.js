/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import Canvas2DLayout from './canvas2DLayout.js';
/**/
// begin code

/**
 * Platform implementation that renders the application onto an HTML canvas using
 * the 2D context. It creates the canvas element, provides the matching layout, and
 * reports the available desktop dimensions.
 */
export class Canvas2DPlatform extends AbstractPlatform {

  /**
   * Creates the canvas 2D platform.
   */
  constructor() {
    super();
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'HTML canvas 2D';
  } // platformName

  /**
   * Creates and initializes the canvas element inside the given parent element and
   * obtains its 2D drawing context.
   * @param {Object} app - The application instance.
   * @param {string} parentElementID - The DOM id of the parent element to host the canvas.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);
    
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

  /**
   * Creates the layout object for this platform.
   * @param {Object} app - The application instance.
   * @returns {Canvas2DLayout} A new canvas 2D layout.
   */
  newLayout(app) {
    return new Canvas2DLayout(app);
  } // newLayout

  /**
   * Reports the available desktop area based on the canvas element size.
   * @param {Object} app - The application instance.
   * @returns {Object} An object with width, height, and defaultColor properties.
   */
  desktop(app) {
    return {width: app.element.clientWidth, height: app.element.clientHeight, defaultColor: false};
  } // desktop

} // Canvas2DPlatform

export default Canvas2DPlatform;
