/**/
const { AbstractLayout } = await import('./abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from './abstractLayout.js';
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
    return {width: this.app.element.clientWidth, height: this.app.element.clientHeight};
  } // canvas

  resizeScreen(screen) {
    var xRatio = this.app.element.clientWidth/(screen.desktopWidth);
    var yRatio = this.app.element.clientHeight/(screen.desktopHeight);

    this.app.element.width = this.app.layout.canvas()['width'];
    this.app.element.height = this.app.layout.canvas()['height'];

    screen.desktopView.x = screen.borderWidth;
    screen.desktopView.y = screen.borderHeight;
    screen.desktopView.width = screen.desktopWidth;
    screen.desktopView.height = screen.desktopHeight;
    screen.desktopView.parentWidth = screen.desktopWidth;
    screen.desktopView.parentHeight = screen.desktopHeight;

    this.prepareCoordinates(screen);
  } // resizeScreen

  prepareCoordinates(screen) {
    this.realX = [];
    var x = 0;
    while (x < screen.desktopWidth) {
      this.realX.push(Math.round(x/(screen.desktopWidth)*this.app.element.clientWidth));
      x++;
    }
    this.realX.push(this.app.element.clientWidth);

    this.realY = [];
    var y = 0;
    while (y < screen.desktopHeight) {
      this.realY.push(Math.round(y/(screen.desktopHeight)*this.app.element.clientHeight));
      y++;
    }
    this.realY.push(this.app.element.clientHeight);
  } // prepareCoordinates

  nativeX(screen, x) {
    if (x < 0) {
      console.log('ERROR: nativeX < 0 ->('+x+')');
      return -1;
    }
    if (x > screen.desktopWidth) {
      console.log('ERROR: nativeX > screen width ->('+x+')');
      return screen.desktopWidth;
    }
    return this.realX[x];
  } // nativeX

  nativeY(screen, y) {
    if (y < 0) {
      console.log('ERROR: nativeY < 0 ->('+y+')');
      return -1;
    }
    if (y > screen.desktopHeight) {
      console.log('ERROR: nativeY > screen height ->('+y+')');
      return screen.desktopHeight;
    }
    return this.realY[y];
  } // nativeY

  paintRect(view, x, y, width, height, color) {
    view.stack['element'].style.left = this.nativeX(view.screen, x)+'px';
    view.stack['element'].style.top = this.nativeY(view.screen, y)+'px';
    view.stack['element'].style.width = this.nativeX(view.screen, x+width)-this.nativeX(view.screen, x)+'px';
    view.stack['element'].style.height = this.nativeY(view.screen, y+height)-this.nativeY(view.screen, y)+'px';
    if (color !== false) {
      view.stack['element'].style.backgroundColor = color;
    }
  } // paintRect

} // class HTMLLayout

export default HTMLLayout;
