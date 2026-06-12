/**/

/*/

/**/
// begin code

/**
 * Base class for a layout. Responsible for mapping the model onto the canvas:
 * handling resize, clearing the canvas and converting client (DOM) coordinates
 * into model coordinates. Subclasses implement the platform-specific behavior.
 */
export class AbstractLayout {

  /**
   * Creates the layout bound to its application.
   * @param {AbstractApp} app - The owning application.
   */
  constructor(app) {
    this.app = app;
    this.id = 'AbstractLayout';
  } // constructor
  
  /**
   * Adjusts the layout to the model's current size. The base implementation does nothing.
   * @param {AbstractModel} model - The model being resized.
   */
  resizeModel(model) {
  } // resizeModel

  /**
   * Clears the canvas. The base implementation does nothing.
   */
  clearCanvas() {
  } // clearCanvas

  /**
   * Converts an x coordinate from client (DOM) space to model space.
   * @param {number} clientX - The client-space x coordinate.
   * @returns {number} The corresponding model-space x coordinate.
   */
  convertClientCoordinateX(clientX) {
    return clientX;
  } // convertClientCoordinateX

  /**
   * Converts a y coordinate from client (DOM) space to model space.
   * @param {number} clientY - The client-space y coordinate.
   * @returns {number} The corresponding model-space y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return clientY;
  } // convertClientCoordinateY

} // AbstractLayout

export default AbstractLayout;
