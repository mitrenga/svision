/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

export class NativeLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.id = 'NativeLayout';

    this.realX = [];
    this.realY = [];
  } // constructor

  canvas() {
    return {width: this.app.element.clientWidth, height: this.app.element.clientHeight};
  } // canvas

  resizeScreen(screen) {
    console.log('resizeScreen');
    super.resizeScreen(screen);
    this.prepareCoordinates(screen);
  } // resizeScreen

  prepareCoordinates(screen) {
    this.realX = [];
    var x = 0;
    while (x < screen.desktopWidth+2*screen.borderWidth) {
      this.realX.push(Math.round(x/(screen.desktopWidth+2*screen.borderWidth)*this.app.element.clientWidth));
      x++;
    }
    this.realX.push(this.app.element.clientWidth);

    this.realY = [];
    var y = 0;
    while (y < screen.desktopHeight+2*screen.borderHeight) {
      this.realY.push(Math.round(y/(screen.desktopHeight+2*screen.borderHeight)*this.app.element.clientHeight));
      y++;
    }
    this.realY.push(this.app.element.clientHeight);
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
    if (color !== false) {
      this.app.stack['ctx'].fillStyle = color;
      this.app.stack['ctx'].fillRect(
        this.nativeX(view.screen, x),
        this.nativeY(view.screen, y),
        this.nativeX(view.screen, x+width)-this.nativeX(view.screen, x),
        this.nativeY(view.screen, y+height)-this.nativeY(view.screen, y)
      );
    }
  } // paintRect

} // class NativeLayout

export default NativeLayout;
