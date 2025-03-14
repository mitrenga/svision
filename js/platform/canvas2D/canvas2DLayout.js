/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

export class Canvas2DLayout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.app = app;
    this.id = 'Canvas2DLayout';
  } // constructor

  paintRect(view, x, y, width, height, color) {
  } // paintRect

  resizeScreen(screen) {
    super.resizeScreen(screen);
    
    var xRatio = this.app.element.clientWidth/(screen.desktopWidth+2*screen.minimalBorder);
    var yRatio = this.app.element.clientHeight/(screen.desktopHeight+2*screen.minimalBorder);

    if (yRatio < xRatio) {
      if (yRatio < 2) {
        screen.borderHeight = screen.minimalBorder;
      } else {
        screen.borderHeight = screen.optimalBorder;
        yRatio = this.app.element.clientHeight/(screen.desktopHeight+2*screen.optimalBorder);
      }
      screen.borderWidth = Math.round((this.app.element.clientWidth/yRatio-screen.desktopWidth)/2);
    } else {
      if (xRatio < 2) {
        screen.borderWidth = screen.minimalBorder;
      } else {
        screen.borderWidth = screen.optimalBorder;
        xRatio = this.app.element.clientWidth/(screen.desktopWidth+2*screen.optimalBorder);
      }
      screen.borderHeight = Math.round((this.app.element.clientHeight/xRatio-screen.desktopHeight)/2);
    } 

    this.app.element.width = this.app.layout.canvas()['width'];
    this.app.element.height = this.app.layout.canvas()['height'];

    if (screen.borderView != null) {
      screen.borderView.x = 0;
      screen.borderView.y = 0;
      screen.borderView.width = screen.desktopWidth+2*screen.borderWidth;
      screen.borderView.height = screen.desktopHeight+2*screen.borderHeight;
      screen.borderView.parentWidth = screen.desktopWidth+2*screen.borderWidth;
      screen.borderView.parentHeight = screen.desktopHeight+2*screen.borderHeight;
    }

    screen.desktopView.x = screen.borderWidth;
    screen.desktopView.y = screen.borderHeight;
    screen.desktopView.width = screen.desktopWidth;
    screen.desktopView.height = screen.desktopHeight;
    screen.desktopView.parentWidth = screen.desktopWidth+2*screen.borderWidth;
    screen.desktopView.parentHeight = screen.desktopHeight+2*screen.borderHeight;
  } // resizeScreen

  drawView(view) {
    this.paint(view, 0, 0, view.width, view.height, view.bkColor);
  } // drawView

  paint(view, x, y, width, height, color) {
    if (color !== false) {
      var w = width;
      if (view.x+x < 0) {
        w = w+view.x;
        x = -view.x;
        if (w < 0) {
          w = 0;
        }
      }
      if (x < 0) {
        w = w+x;
        x = 0;
        if (w < 0) {
          w = 0;
        }
      }
      if (view.x+x+w > view.parentWidth) {
        w = view.parentWidth-view.x-x;
        if (w < 0) {
          w = 0;
        }
      }
      if (x+w > view.width) {
        w = view.width-x;
        if (w < 0) {
          w = 0;
        }
      }
      var h = height;
      if (view.y+y < 0) {
        h = h+view.y;
        y = -view.y;
        if (h < 0) {
          h = 0;
        }
      }
      if (y < 0) {
        h = h+y;
        y = 0;
        if (h < 0) {
          h = 0;
        }
      }
      if (view.y+y+h > view.parentHeight) {
        h = view.parentHeight-view.y-y;
        if (h < 0) {
          h = 0;
        }
      }
      if (y+h > view.height) {
        h = view.height-y;
        if (h < 0) {
          h = 0;
        }
      }
      if (w > 0 && h > 0) {
        this.paintRect(view, view.parentX+view.x+x, view.parentY+view.y+y, w, h, color);
      }
    }
  } // paint

} // class Canvas2DLayout

export default Canvas2DLayout;
