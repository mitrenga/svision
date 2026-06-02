/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
/**/
// begin code

export class AdaptiveLayout extends Canvas2DLayout {
  
  constructor(app) {
    super(app);
    this.id = 'AdaptiveLayout';
  } // constructor

  resizeModel(model) {
    this.ratio = 1;
    var elementSize = this.app.element.clientHeight;
    if (this.app.element.clientWidth > this.app.element.clientHeight) {
      elementSize = this.app.element.clientWidth;
    }
    while (elementSize/this.ratio > model.desktopWidth) {
      this.ratio++;
    }
    
    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;

    model.desktopEntity.x = 0;
    model.desktopEntity.y = 0;
    model.desktopEntity.width = Math.ceil(this.app.element.clientWidth/this.ratio);
    model.desktopEntity.height = Math.ceil(this.app.element.clientHeight/this.ratio);
    model.desktopEntity.parentWidth = model.desktopEntity.width;
    model.desktopEntity.parentHeight = model.desktopEntity.height;
  } // resizeModel

  convertClientCoordinateX(clientX) {
    return Math.round(this.app.element.width/this.ratio/this.app.element.clientWidth*clientX);
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return Math.round(this.app.element.height/this.ratio/this.app.element.clientHeight*clientY);
  } // convertClientCoordinateY

} // AdaptiveLayout

export default AdaptiveLayout;
