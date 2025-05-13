/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
/**/
// begin code

export class ZXSpectrumLayout extends Canvas2DLayout {
  
  constructor(app) {
    super(app);
    this.id = 'ZXSpectrumLayout';

    this.ratio = 1;
  } // constructor

  resizeModel(model) {
    this.ratio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < this.ratio) {
      this.ratio = yRatio;
    }
    if (this.ratio >= 2) {
      this.ratio = Math.floor(this.ratio);
    }
    if (this.ratio < 1) {
      this.ratio = 1;
    }

    model.borderWidth = Math.ceil((this.app.element.clientWidth-model.desktopWidth*this.ratio)/2/this.ratio);
    model.borderHeight = Math.ceil((this.app.element.clientHeight-model.desktopHeight*this.ratio)/2/this.ratio);

    this.ratio = Math.floor(this.ratio);

    this.app.element.width = Math.round((model.desktopWidth+2*model.borderWidth)*this.ratio);
    this.app.element.height = Math.round((model.desktopHeight+2*model.borderHeight)*this.ratio);

    model.borderEntity.x = 0;
    model.borderEntity.y = 0;
    model.borderEntity.width = model.desktopWidth+2*model.borderWidth;
    model.borderEntity.height = model.desktopHeight+2*model.borderHeight;
    model.borderEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.borderEntity.parentHeight = model.desktopHeight+2*model.borderHeight;

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.desktopEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
  } // resizeModel

  paintRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*this.ratio, y*this.ratio, width*this.ratio, height*this.ratio);
  } // paintRect

  convertClientCoordinateX(clientX) {
    return this.app.element.width/this.ratio/this.app.element.clientWidth*clientX;
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return this.app.element.height/this.ratio/this.app.element.clientHeight*clientY;
  } // convertClientCoordinateY

} // class ZXSpectrumLayout

export default ZXSpectrumLayout;
