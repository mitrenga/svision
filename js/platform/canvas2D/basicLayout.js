/**/
const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from './canvas2DLayout.js';
/**/
// begin code

export class BasicLayout extends Canvas2DLayout {
  
  constructor(app) {
    super(app);
    this.id = 'BasicLayout';
  } // constructor

  canvas() {
    return {'width': this.app.screen.desktopWidth+2*this.app.screen.borderWidth, 'height': this.app.screen.desktopHeight+2*this.app.screen.borderHeight};
  } // canvas
  
  paintRect(view, x, y, width, height, color) {
    var ctx = this.app.stack['ctx'];
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  } // paintRect

} // class BasicLayout

export default BasicLayout;
