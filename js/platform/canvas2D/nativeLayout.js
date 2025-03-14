/**/
const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from './canvas2DLayout.js';
/**/
// begin code

export class NativeLayout extends Canvas2DLayout {
  
  constructor(app) {
    super(app);
    this.id = 'NativeLayout';

    this.realX = [];
    this.realY = [];
  } // constructor

  canvas() {
    return {'width': this.app.element.clientWidth, 'height': this.app.element.clientHeight};
  } // canvas

  resizeModel(model) {
    super.resizeModel(model);
    this.prepareCoordinates(model);
  } // resizeModel

  prepareCoordinates(model) {
    this.realX = [];
    this.realY = [];
    if (model.desktopWidth+2*model.borderWidth != this.app.element.clientWidth || model.desktopHeight+2*model.borderHeight != this.app.element.clientHeight) {
      var x = 0;
      while (x < model.desktopWidth+2*model.borderWidth) {
        this.realX.push(Math.round(x/(model.desktopWidth+2*model.borderWidth)*this.app.element.clientWidth));
        x++;
      }
      this.realX.push(this.app.element.clientWidth);
  
      var y = 0;
      while (y < model.desktopHeight+2*model.borderHeight) {
        this.realY.push(Math.round(y/(model.desktopHeight+2*model.borderHeight)*this.app.element.clientHeight));
        y++;
      }
      this.realY.push(this.app.element.clientHeight);
    }
  } // prepareCoordinates

  nativeX(model, x) {
    if (x < 0) {
      console.log('ERROR: nativeX < 0 ->('+x+')');
      return -1;
    }
    if (x > model.desktopWidth+2*model.borderWidth) {
      console.log('ERROR: nativeX > model width ->('+x+')');
      return model.desktopWidth+2*model.borderWidth;
    }
    return this.realX[x];
  } // nativeX

  nativeY(model, y) {
    if (y < 0) {
      console.log('ERROR: nativeY < 0 ->('+y+')');
      return -1;
    }
    if (y > model.desktopHeight+2*model.borderHeight) {
      console.log('ERROR: nativeY > model height ->('+y+')');
      return model.desktopHeight+2*model.borderHeight;
    }
    return this.realY[y];
  } // nativeY

  paintRect(entity, x, y, width, height, color) {
    var ctx = this.app.stack['ctx'];
    ctx.fillStyle = color;
    if (this.realX.length > 0 || this.realY.length > 0) {
      ctx.fillRect(
        this.nativeX(entity.model, x),
        this.nativeY(entity.model, y),
        this.nativeX(entity.model, x+width)-this.nativeX(entity.model, x),
        this.nativeY(entity.model, y+height)-this.nativeY(entity.model, y)
      );
    } else {
      ctx.fillRect(x, y, width, height);
    }
  } // paintRect

} // class NativeLayout

export default NativeLayout;
