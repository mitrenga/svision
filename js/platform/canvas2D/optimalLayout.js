/**/
const { NativeLayout } = await import('./nativeLayout.js?ver='+window.srcVersion);
/*/
import NativeLayout from './nativeLayout.js';
/**/
// begin code

export class OptimalLayout extends NativeLayout {
  
  constructor(app) {
    super(app);
    this.id = 'OptimalLayout';
  } // constructor

  resizeModel(model) {
    var ratio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < ratio) {
      ratio = yRatio;
    }
    if (ratio > 1) {
      ratio = Math.floor(ratio);
    }

    model.borderWidth = Math.ceil((this.app.element.clientWidth-model.desktopWidth*ratio)/2/ratio);
    model.borderHeight = Math.ceil((this.app.element.clientHeight-model.desktopHeight*ratio)/2/ratio);

    this.app.element.width = this.app.layout.canvas()['width'];
    this.app.element.height = this.app.layout.canvas()['height'];

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

    this.prepareCoordinates(model);
  } // resizeModel

} // class OptimalLayout

export default OptimalLayout;
