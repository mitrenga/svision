/**/
const { AbstractLayout } = await import('./abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from './abstractLayout.js';
/**/
// begin code

export class BasicLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.id = 'BasicLayout';
  } // constructor

  canvas() {
    return {width: this.app.screen.desktopWidth+2*this.app.screen.borderWidth, height: this.app.screen.desktopHeight+2*this.app.screen.borderHeight};
  } // canvas
  
  paintRect(view, x, y, width, height, color) {
    if (color !== false) {
      this.app.stack['ctx'].fillStyle = color;
      this.app.stack['ctx'].fillRect(x, y, width, height);
    }
  } // paintRect

} // class BasicLayout

export default BasicLayout;
