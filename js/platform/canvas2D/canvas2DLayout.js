/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
const { DrawingCache } = await import('./drawingCache.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
import DrawingCache from './drawingCache.js';
/**/
// begin code

export class Canvas2DLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.app = app;
    this.id = 'Canvas2DLayout';
    this.ratio = 1;
  } // constructor

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

  clearCanvas() {
    this.app.stack.ctx.clearRect(0, 0, this.app.element.clientWidth, this.app.element.clientHeight);
  } // clearCanvas

  paint(entity, x, y, width, height, color) {
    this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, color);
  } // paint

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

  paintRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  } // paintRect

  newDrawingCache(entity, index) {
    entity.drawingCache[index] = new DrawingCache(entity.app);
  } // newDrawingCache

  newDrawingCropCache(entity) {
    entity.drawingCropCache = new DrawingCache(entity.app);
  } // newDrawingCropCache

  paintCache(entity, index) {
    this.app.stack.ctx.drawImage(entity.drawingCache[index].canvas, (entity.parentX+entity.x)*this.ratio, (entity.parentY+entity.y)*this.ratio);
  } // paintCache

  paintCropCache(entity, index, posX, posY, moveX, moveY) {
    entity.drawingCropCache.needToRefresh(entity, entity.width, entity.height);
    entity.drawingCropCache.ctx.clearRect(0, 0, entity.drawingCropCache.canvas.width, entity.drawingCropCache.canvas.height);
    entity.drawingCropCache.ctx.drawImage(entity.drawingCache[index].canvas, -posX*this.ratio, -posY*this.ratio);
    entity.app.stack.ctx.drawImage(entity.drawingCropCache.canvas, (entity.parentX+entity.x+moveX)*this.ratio, (entity.parentY+entity.y+moveY)*this.ratio);
  } // paintCache

  convertClientCoordinateX(clientX) {
    return this.app.element.width/this.app.element.clientWidth*clientX;
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return this.app.element.height/this.app.element.clientHeight*clientY;
  } // convertClientCoordinateY

} // class Canvas2DLayout

export default Canvas2DLayout;
