/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { WebGL2Layout } = await import('./webGL2Layout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import WebGL2Layout from './webGL2Layout.js';
/**/
// begin code

/**
 * A platform that renders the application through a WebGL2 canvas context. It
 * creates the canvas element, acquires its `webgl2` context, and pairs it with
 * a `WebGL2Layout`.
 *
 * **EXPERIMENTAL — WORK IN PROGRESS.** This platform is at a very early stage
 * and exists only for testing. It is NOT usable for normal deployment and is
 * expected to be moved to a separate branch in the future.
 *
 * @experimental
 */
export class WebGL2Platform extends AbstractPlatform {

  /**
   * Constructs the WebGL2 platform.
   */
  constructor() {
    super();
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'WebGL2';
  } // platformName

  /**
   * Creates the canvas element inside the given parent, acquires its WebGL2
   * rendering context, and records the container type on the stack.
   * @param {Object} app - The owning application instance.
   * @param {string} parentElementID - The id of the parent DOM element.
   */
  initCanvasElement(app, parentElementID) {
    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('canvas');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.element.style.cursor = 'pointer';
    app.parentElement.appendChild(app.element);
    app.stack.ctx = app.element.getContext('webgl2');
    app.stack.containerType = 'webGL2';
  } // initCanvasElement

  /**
   * Initializes platform-specific state for an entity. WebGL2 entities require
   * no per-entity DOM, so this is a no-op.
   * @param {Object} entity - The entity being initialized.
   * @returns {boolean} Always false.
   */
  initEntity(entity) {
    return false;
  } // initEntity

  /**
   * Creates the layout used by this platform.
   * @param {Object} app - The owning application instance.
   * @returns {WebGL2Layout} A new WebGL2 layout bound to the app.
   */
  newLayout(app) {
    return new WebGL2Layout(app);
  } // newLayout

  /**
   * Returns the desktop descriptor (dimensions and default color) for this
   * platform, sized to the current canvas client area.
   * @param {Object} app - The owning application instance.
   * @returns {Object} An object with `width`, `height`, and `defaultColor`.
   */
  desktop(app) {
    return {width: app.element.clientWidth, height: app.element.clientHeight, defaultColor: false};
  } // desktop

} // WebGL2Platform

export default WebGL2Platform;
