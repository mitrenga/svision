/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

/**
 * A layout that renders entities as absolutely positioned DOM elements. It
 * maps logical model coordinates to real client pixel coordinates using
 * precomputed lookup tables (`realX`, `realY`) so that the model grid scales
 * to the element's actual size.
 *
 * **EXPERIMENTAL — WORK IN PROGRESS.** This layout is at a very early stage
 * and exists only for testing. It is NOT usable for normal deployment and is
 * expected to be moved to a separate branch in the future.
 *
 * @experimental
 */
export class HTMLLayout extends AbstractLayout {

  /**
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'HTMLLayout';

    this.realX = [];
    this.realY = [];
  } // constructor

  /**
   * Resizes the model's desktop entity to the configured logical dimensions
   * and rebuilds the coordinate lookup tables.
   * @param {Object} model - The model whose desktop entity is being resized.
   */
  resizeModel(model) {
    super.resizeModel(model);
    
    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth;
    model.desktopEntity.parentHeight = model.desktopHeight;

    this.prepareCoordinates(model);
  } // resizeModel

  /**
   * Builds the `realX` and `realY` lookup tables mapping each logical model
   * coordinate to a real client pixel coordinate based on the current element
   * size.
   * @param {Object} model - The model providing the logical desktop dimensions.
   */
  prepareCoordinates(model) {
    this.realX = [];
    var x = 0;
    while (x < model.desktopWidth) {
      this.realX.push(Math.round(x/(model.desktopWidth)*this.app.element.clientWidth));
      x++;
    }
    this.realX.push(this.app.element.clientWidth);

    this.realY = [];
    var y = 0;
    while (y < model.desktopHeight) {
      this.realY.push(Math.round(y/(model.desktopHeight)*this.app.element.clientHeight));
      y++;
    }
    this.realY.push(this.app.element.clientHeight);
  } // prepareCoordinates

  /**
   * Maps a logical model X coordinate to a real client pixel X coordinate,
   * logging and clamping when the value is out of range.
   * @param {Object} model - The model providing the logical desktop width.
   * @param {number} x - The logical model X coordinate.
   * @returns {number} The corresponding real client pixel X coordinate.
   */
  nativeX(model, x) {
    if (x < 0) {
      console.log('ERROR: nativeX < 0 ->('+x+')');
      return -1;
    }
    if (x > model.desktopWidth) {
      console.log('ERROR: nativeX > model width ->('+x+')');
      return model.desktopWidth;
    }
    return this.realX[x];
  } // nativeX

  /**
   * Maps a logical model Y coordinate to a real client pixel Y coordinate,
   * logging and clamping when the value is out of range.
   * @param {Object} model - The model providing the logical desktop height.
   * @param {number} y - The logical model Y coordinate.
   * @returns {number} The corresponding real client pixel Y coordinate.
   */
  nativeY(model, y) {
    if (y < 0) {
      console.log('ERROR: nativeY < 0 ->('+y+')');
      return -1;
    }
    if (y > model.desktopHeight) {
      console.log('ERROR: nativeY > model height ->('+y+')');
      return model.desktopHeight;
    }
    return this.realY[y];
  } // nativeY

  /**
   * Positions and sizes the entity's DOM element to match its logical bounds,
   * applying the background color when one is set.
   * @param {Object} entity - The entity to draw, carrying its DOM element and
   *   logical position/size.
   */
  drawEntity(entity) {
    var element = entity.stack.element;
    element.style.left = this.nativeX(entity.model, entity.x)+'px';
    element.style.top = this.nativeY(entity.model, entity.y)+'px';
    element.style.width = this.nativeX(entity.model, entity.x+entity.width)-this.nativeX(entity.model, entity.x)+'px';
    element.style.height = this.nativeY(entity.model, entity.y+entity.height)-this.nativeY(entity.model, entity.y)+'px';
    if (entity.bkColor !== false) {
      element.style.backgroundColor = entity.bkColor;
    }
  } // drawEntity

} // HTMLLayout

export default HTMLLayout;
