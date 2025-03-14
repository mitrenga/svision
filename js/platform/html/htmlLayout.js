/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

export class HTMLLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.id = 'HTMLLayout';

    this.realX = [];
    this.realY = [];
  } // constructor

  canvas() {
    return {'width': this.app.element.clientWidth, 'height': this.app.element.clientHeight};
  } // canvas

  resizeModel(model) {
    super.resizeModel(model);
    
    this.app.element.width = this.app.layout.canvas()['width'];
    this.app.element.height = this.app.layout.canvas()['height'];

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth;
    model.desktopEntity.parentHeight = model.desktopHeight;

    this.prepareCoordinates(model);
  } // resizeModel

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

  drawEntity(entity) {
    var element = entity.stack['element'];
    element.style.left = this.nativeX(entity.model, entity.x)+'px';
    element.style.top = this.nativeY(entity.model, entity.y)+'px';
    element.style.width = this.nativeX(entity.model, entity.x+entity.width)-this.nativeX(entity.model, entity.x)+'px';
    element.style.height = this.nativeY(entity.model, entity.y+entity.height)-this.nativeY(entity.model, entity.y)+'px';
    if (entity.bkColor !== false) {
      element.style.backgroundColor = entity.bkColor;
    }
  } // drawEntity

} // class HTMLLayout

export default HTMLLayout;
