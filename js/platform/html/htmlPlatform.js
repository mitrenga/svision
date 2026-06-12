/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { HTMLLayout } = await import('./htmlLayout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import HTMLLayout from './htmlLayout.js';
/**/
// begin code

/**
 * A platform that renders the application using plain HTML DOM elements. It
 * creates a container `div`, builds nested `div` elements for entities, and
 * pairs the canvas with an `HTMLLayout`.
 *
 * **EXPERIMENTAL — WORK IN PROGRESS.** This platform is at a very early stage
 * and exists only for testing. It is NOT usable for normal deployment and is
 * expected to be moved to a separate branch in the future.
 *
 * @experimental
 */
export class HTMLPlatform extends AbstractPlatform {

  /**
   * Constructs the HTML platform.
   */
  constructor() {
    super();
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'HTML5';
  } // platformName

  /**
   * Creates the root container `div` for the application inside the given
   * parent element and marks the stack container type as HTML.
   * @param {Object} app - The owning application instance.
   * @param {string} parentElementID - The id of the parent DOM element.
   */
  initCanvasElement(app, parentElementID) {
    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('div');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.parentElement.appendChild(app.element);
    app.stack.containerType = 'html';
  } // initCanvasElement

  /**
   * Creates an absolutely positioned `div` for the entity, attaching it to its
   * parent entity's element (or the app root when there is no parent).
   * @param {Object} entity - The entity to create a DOM element for.
   * @returns {Object} An object holding the created `element`.
   */
  initEntity(entity) {
    var parentElement = null;
    if (entity.parentEntity == null) {
      parentElement = entity.app.element;
    } else {
      parentElement = entity.parentEntity.stack.element;
    }
    var element = document.createElement('div');
    element.id = entity.id;
    element.style.position = 'absolute';
    parentElement.appendChild(element);
    return {element: element};
  } // initEntity


  /**
   * Creates the layout used by this platform.
   * @param {Object} app - The owning application instance.
   * @returns {HTMLLayout} A new HTML layout bound to the app.
   */
  newLayout(app) {
    return new HTMLLayout(app);
  } // newLayout

  /**
   * Returns the desktop descriptor (dimensions and default color) for this
   * platform.
   * @param {Object} app - The owning application instance.
   * @returns {Object} An object with `width`, `height`, and `defaultColor`.
   */
  desktop(app) {
    return {width: 256, height: 192, defaultColor: 'white'};
  } // desktop

} // HTMLPlatform

export default HTMLPlatform;
