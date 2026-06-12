/**/

/*/

/**/
// begin code

/**
 * Base class for a platform. Defines the interface a concrete platform must
 * implement: creating the canvas element and layout, initializing entities and
 * reporting desktop and border geometry/colors.
 */
export class AbstractPlatform {

  /**
   * Creates the platform. The base implementation does nothing.
   */
  constructor() {
  } // constructor

  /**
   * Returns the platform's name.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'AbstractPlatform';
  } // platformName
  
  /**
   * Creates and attaches the canvas element to its parent. The base implementation does nothing.
   * @param {AbstractApp} app - The owning application.
   * @param {HTMLElement|string} parentElementID - The parent element (or its id) that hosts the canvas.
   */
  initCanvasElement(app, parentElementID) {
  } // initCanvasElement

  /**
   * Creates platform-specific helper objects for an entity. The base implementation returns false.
   * @param {AbstractEntity} entity - The entity to initialize.
   * @returns {Object|false} A map of objects to merge into the entity's stack, or false for none.
   */
  initEntity(entity) {
    return false;
  } // initEntity

  /**
   * Creates the layout instance for the application. The base implementation returns false.
   * @param {AbstractApp} app - The owning application.
   * @returns {AbstractLayout|false} The new layout, or false for none.
   */
  newLayout(app) {
    return false;
  } // newLayout

  /**
   * Returns the desktop area geometry and default color.
   * @param {AbstractApp} app - The owning application.
   * @returns {{width: number, height: number, defaultColor: string|false}} The desktop dimensions and default color.
   */
  desktop(app) {
    return {width: 0, height: 0, defaultColor: false};
  } // resolution

  /**
   * Returns the border definition for the platform. The base implementation returns false.
   * @param {AbstractApp} app - The owning application.
   * @returns {Object|false} The border definition (e.g. minimal/defaultColor), or false when there is no border.
   */
  border(app) {
    return false;
  } // border

} // AbstractPlatform

export default AbstractPlatform;
