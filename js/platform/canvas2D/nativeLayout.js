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

  resizeScreen(screen) {
    super.resizeScreen(screen);
    this.prepareCoordinates(screen);
  } // resizeScreen

  prepareCoordinates(screen) {
    this.realX = [];
    this.realY = [];
    if (screen.desktopWidth+2*screen.borderWidth != this.app.element.clientWidth || screen.desktopHeight+2*screen.borderHeight != this.app.element.clientHeight) {
      var x = 0;
      while (x < screen.desktopWidth+2*screen.borderWidth) {
        this.realX.push(Math.round(x/(screen.desktopWidth+2*screen.borderWidth)*this.app.element.clientWidth));
        x++;
      }
      this.realX.push(this.app.element.clientWidth);
  
      var y = 0;
      while (y < screen.desktopHeight+2*screen.borderHeight) {
        this.realY.push(Math.round(y/(screen.desktopHeight+2*screen.borderHeight)*this.app.element.clientHeight));
        y++;
      }
      this.realY.push(this.app.element.clientHeight);
    }
  } // prepareCoordinates

  nativeX(screen, x) {
    if (x < 0) {
      console.log('ERROR: nativeX < 0 ->('+x+')');
      return -1;
    }
    if (x > screen.desktopWidth+2*screen.borderWidth) {
      console.log('ERROR: nativeX > screen width ->('+x+')');
      return screen.desktopWidth+2*screen.borderWidth;
    }
    return this.realX[x];
  } // nativeX

  nativeY(screen, y) {
    if (y < 0) {
      console.log('ERROR: nativeY < 0 ->('+y+')');
      return -1;
    }
    if (y > screen.desktopHeight+2*screen.borderHeight) {
      console.log('ERROR: nativeY > screen height ->('+y+')');
      return screen.desktopHeight+2*screen.borderHeight;
    }
    return this.realY[y];
  } // nativeY

  paintRect(view, x, y, width, height, color) {
    var ctx = this.app.stack['ctx'];
    ctx.fillStyle = color;
    if (this.realX.length > 0 || this.realY.length > 0) {
      ctx.fillRect(
        this.nativeX(view.screen, x),
        this.nativeY(view.screen, y),
        this.nativeX(view.screen, x+width)-this.nativeX(view.screen, x),
        this.nativeY(view.screen, y+height)-this.nativeY(view.screen, y)
      );
    } else {
      ctx.fillRect(x, y, width, height);
    }
  } // paintRect

} // class NativeLayout

export default NativeLayout;
