/**/
const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
const { BasicLayout } = await import('./basicLayout.js?ver='+window.srcVersion);
const { NativeLayout } = await import('./nativeLayout.js?ver='+window.srcVersion);
const { OptimalLayout } = await import('./optimalLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from './canvas2DLayout.js';
import BasicLayout from './basicLayout.js';
import NativeLayout from './nativeLayout.js';
import OptimalLayout from './optimalLayout.js';
/**/
// begin code

export class AutoLayout extends Canvas2DLayout {
  
  constructor(app) {
    super(app);
    this.id = 'AutoLayout';

    this.layout = false;
  } // constructor

  canvas() {
    if (this.layout !== false) {
      return this.layout.canvas();
    }
    return super.element();
  } // canvas
  
  resizeScreen(screen) {
    var ratio = Math.floor(this.app.element.clientWidth/(screen.desktopWidth));
    var yRatio = Math.floor(this.app.element.clientHeight/(screen.desktopHeight));
    if (yRatio < ratio) {
      ratio = yRatio;
    }

    if (ratio >= 3) {
      this.setLayout('OptimalLayout');
    } else if (ratio >= 2) {
      this.setLayout('NativeLayout');
    } else {
      this.setLayout('BasicLayout');
    }
    this.layout.resizeScreen(screen);
  } // resizeScreen

  setLayout(id) {
    if (this.layout != false && this.layout.id == id) {
      return;
    }
    switch (id) {
      case 'BasicLayout':
        this.layout = new BasicLayout(this.app);
        break;
      case 'NativeLayout':
        this.layout = new NativeLayout(this.app);
        break;
      case 'OptimalLayout':
        this.layout = new OptimalLayout(this.app);
        break;
      default:
        this.layout = false;
        break;
    } // switch
  } // setLayout

  paintRect(view, x, y, width, height, color) {
    if (this.layout !== false) {
      this.layout.paintRect(view, x, y, width, height, color);
    }
  } // paintRect

} // class AutoLayout

export default AutoLayout;
