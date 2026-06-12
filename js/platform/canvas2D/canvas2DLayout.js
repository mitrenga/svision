/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
const { DrawingCache } = await import('./drawingCache.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
import DrawingCache from './drawingCache.js';
/**/
// begin code

/**
 * Layout implementation for the HTML canvas 2D platform. It computes the
 * desktop/border sizing on resize, clears and paints rectangles onto the canvas
 * context, manages drawing caches, and converts client coordinates into model
 * coordinates.
 */
export class Canvas2DLayout extends AbstractLayout {

  /**
   * Creates the canvas 2D layout.
   * @param {Object} app - The application instance owning this layout.
   */
  constructor(app) {
    super(app);
    this.app = app;
    this.id = 'Canvas2DLayout';
    this.ratio = 1;
  } // constructor

  /**
   * Recomputes border widths/heights so the desktop fits the canvas element while
   * preserving aspect ratio, resizes the canvas, and repositions the border and
   * desktop entities accordingly.
   * @param {Object} model - The model holding desktop dimensions and border/desktop entities.
   */
  resizeModel(model) {
    super.resizeModel(model);

    var xRatio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < xRatio) {
      model.borderHeight = model.minimalBorder;
      model.borderWidth = Math.round((this.app.element.clientWidth/yRatio-model.desktopWidth)/2);
    } else {
      model.borderWidth = model.minimalBorder;
      model.borderHeight = Math.round((this.app.element.clientHeight/xRatio-model.desktopHeight)/2);
    } 

    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;

    if (model.borderEntity != null) {
      model.borderEntity.x = 0;
      model.borderEntity.y = 0;
      model.borderEntity.width = model.desktopWidth+2*model.borderWidth;
      model.borderEntity.height = model.desktopHeight+2*model.borderHeight;
      model.borderEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
      model.borderEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
    }

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.desktopEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
  } // resizeModel

  /**
   * Clears the entire canvas element.
   */
  clearCanvas() {
    this.app.stack.ctx.clearRect(0, 0, this.app.element.clientWidth, this.app.element.clientHeight);
  } // clearCanvas

  /**
   * Paints a rectangle relative to an entity's absolute position onto the main canvas.
   * @param {AbstractEntity} entity - The entity providing the coordinate origin.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(entity, x, y, width, height, color) {
    this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, color);
  } // paint

  /**
   * Paints a rectangle relative to an entity while clipping it to the visible area
   * defined by the entity and its parent bounds.
   * @param {AbstractEntity} entity - The entity providing the coordinate origin and bounds.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paintWithVisibility(entity, x, y, width, height, color) {
    this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, color);
    if (entity.x+x < 0) {
      w = w+entity.x;
      x = -entity.x;
      if (w < 0) {
        w = 0;
      }
    }
    if (x < 0) {
      w = w+x;
      x = 0;
      if (w < 0) {
        w = 0;
      }
    }
    if (entity.x+x+w > entity.parentWidth) {
      w = entity.parentWidth-entity.x-x;
      if (w < 0) {
        w = 0;
      }
    }
    if (x+w > entity.width) {
      w = entity.width-x;
      if (w < 0) {
        w = 0;
      }
    }
    var h = height;
    if (entity.y+y < 0) {
      h = h+entity.y;
      y = -entity.y;
      if (h < 0) {
        h = 0;
      }
    }
    if (y < 0) {
      h = h+y;
      y = 0;
      if (h < 0) {
        h = 0;
      }
    }
    if (entity.y+y+h > entity.parentHeight) {
      h = entity.parentHeight-entity.y-y;
      if (h < 0) {
        h = 0;
      }
    }
    if (y+h > entity.height) {
      h = entity.height-y;
      if (h < 0) {
        h = 0;
      }
    }
    if (w > 0 && h > 0) {
      this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, w, h, color);
    }
  } // paintWithVisibility

  /**
   * Fills a rectangle on the given context, scaling all coordinates by the layout ratio.
   * @param {CanvasRenderingContext2D} ctx - The target drawing context.
   * @param {number} x - X position in model coordinates.
   * @param {number} y - Y position in model coordinates.
   * @param {number} width - Rectangle width in model coordinates.
   * @param {number} height - Rectangle height in model coordinates.
   * @param {string} color - Fill color.
   */
  paintRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*this.ratio, y*this.ratio, width*this.ratio, height*this.ratio);
  } // paintRect

  /**
   * Creates a new drawing cache slot for an entity at the given index.
   * @param {AbstractEntity} entity - The entity to attach the cache to.
   * @param {number} index - The cache slot index.
   */
  newDrawingCache(entity, index) {
    entity.drawingCache[index] = new DrawingCache(entity.app);
  } // newDrawingCache

  /**
   * Creates the crop cache used to render an entity clipped to its parent bounds.
   * @param {AbstractEntity} entity - The entity to attach the crop cache to.
   */
  newDrawingCropCache(entity) {
    entity.drawingCropCache = new DrawingCache(entity.app);
  } // newDrawingCropCache

  /**
   * Draws a cached entity image onto the main canvas at the entity's absolute position.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   */
  paintCache(entity, index) {
    this.app.stack.ctx.drawImage(entity.drawingCache[index].canvas, (entity.parentX+entity.x)*this.ratio, (entity.parentY+entity.y)*this.ratio);
  } // paintCache

  /**
   * Draws a cropped/offset portion of an entity's cached image onto the main canvas,
   * refreshing the crop cache as needed.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   * @param {number} posX - X offset into the source cache image.
   * @param {number} posY - Y offset into the source cache image.
   * @param {number} moveX - Additional X offset applied to the destination position.
   * @param {number} moveY - Additional Y offset applied to the destination position.
   */
  paintCropCache(entity, index, posX, posY, moveX, moveY) {
    entity.drawingCropCache.needToRefresh(entity, entity.width, entity.height);
    entity.drawingCropCache.ctx.clearRect(0, 0, entity.drawingCropCache.canvas.width, entity.drawingCropCache.canvas.height);
    entity.drawingCropCache.ctx.drawImage(entity.drawingCache[index].canvas, -posX*this.ratio, -posY*this.ratio);
    entity.app.stack.ctx.drawImage(entity.drawingCropCache.canvas, (entity.parentX+entity.x+moveX)*this.ratio, (entity.parentY+entity.y+moveY)*this.ratio);
  } // paintCache

  /**
   * Converts a client (DOM) X coordinate into a canvas pixel X coordinate.
   * @param {number} clientX - The client X coordinate.
   * @returns {number} The corresponding canvas X coordinate.
   */
  convertClientCoordinateX(clientX) {
    return Math.round(this.app.element.width/this.app.element.clientWidth*clientX);
  } // convertClientCoordinateX

  /**
   * Converts a client (DOM) Y coordinate into a canvas pixel Y coordinate.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding canvas Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round(this.app.element.height/this.app.element.clientHeight*clientY);
  } // convertClientCoordinateY

} // Canvas2DLayout

export default Canvas2DLayout;
