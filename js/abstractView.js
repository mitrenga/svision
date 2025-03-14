/**/

/*/

/**/
// begin code

export class AbstractView {

  constructor(parentView, x, y, width, height, penColor, bkColor) {
    this.id = 'AbstractView';

    this.app = null;
    this.parentView = parentView;
    
    if (this.parentView != null) {
      this.screen = this.parentView.screen;
      this.app = this.parentView.screen.app;
    }

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.bkColor = bkColor;
    this.penColor = penColor;

    this.parentX = 0;
    this.parentY = 0;
    this.parentWidth = width;
    this.parentHeight = height;

    this.stack = {};
    this.views = [];
  } // constructor
  
  addView(view) {
    var viewObjects = this.app.platform.initView(view);
    if (viewObjects !== false) {
      view.stack = {...view.stack, ...viewObjects};
    }
    this.views.push(view);
  } // addView
  
  sendEvent(direction, timing, message) {
    if (timing == 0) {
      switch (direction) {
        case -1:
          if (this.parentView != null) {
            if (this.parentView.handleEvent(message) == false) {
              for (var v = 0; v < this.parentView.views.length; v++) {
                if (this.parentView.views[v].handleEvent(message) == true) {
                  break;
                }
              }
            }
          }
          break;
        case 0:
          this.screen.sendEvent(0, message);
          break;
        case 1:
          for (var v = 0; v < this.views.length; v++) {
            if (this.views[v].handleEvent(message) == true) {
              break;
            }
          }
          break;
      }
    } else {
      this.screen.sendEvent(timing, message);
    }
  } // sendEvent

  cancelEvent(id) {
    this.screen.cancelEvent(id);
  } // cancelEvent

  handleEvent(message) {
    for (var v = 0; v < this.views.length; v++) {
      if (this.views[v].handleEvent(message) == true) {
        return true;
      }
    }
    return false;
  } // handleEvent
  
  setData(data) {
    for (var v = 0; v < this.views.length; v++) {
      this.views[v].setData(data);
    }
  } // setData

  drawView() {
    this.app.layout.drawView(this);

    this.views.forEach ((view) => {
      view.parentX = this.parentX+this.x;
      view.parentY = this.parentY+this.y;
      
      var w = this.width;
      if (this.x+this.width > this.parentWidth) {
        w = this.parentWidth-this.x;
        if (w < 0) {
          w = 0;
        }
      }
      var h = this.height;
      if (this.y+this.height > this.parentHeight) {
        h = this.parentHeight-this.y;
        if (h < 0) {
          h = 0;
        }
      }
      view.parentWidth = w;
      view.parentHeight = h;
      view.drawView();
    });
  } // drawView
  
} // class AbstractView

export default AbstractView;
