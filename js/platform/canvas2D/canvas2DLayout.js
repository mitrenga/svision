/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

export class Canvas2DLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.app = app;
    this.id = 'Canvas2DLayout';
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

  drawEntity(entity) {
    this.paint(entity, 0, 0, entity.width, entity.height, entity.bkColor);
  } // drawEntity

  paint(entity, x, y, width, height, color) {
    if (color !== false) {
      var w = width;
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
        this.paintRect(this.app.stack['ctx'], entity.parentX+entity.x+x, entity.parentY+entity.y+y, w, h, color);
      }
    }
  } // paint

  paintRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  } // paintRect

  convertClientCoordinateX(clientX) {
    return this.app.element.width/this.app.element.clientWidth*clientX;
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return this.app.element.height/this.app.element.clientHeight*clientY;
  } // convertClientCoordinateY

} // class Canvas2DLayout

export default Canvas2DLayout;
