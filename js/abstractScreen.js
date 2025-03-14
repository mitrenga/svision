/**/
const { AbstractView } = await import('./abstractView.js?ver='+window.srcVersion);
const { DesktopView } = await import('./desktopView.js?ver='+window.srcVersion);
const { BorderView } = await import('./borderView.js?ver='+window.srcVersion);
/*/
import AbstractView from './abstractView.js';
import DesktopView from './desktopView.js';
import BorderView from './borderView.js';
/**/
// begin code

export class AbstractScreen {

  constructor(app) {
    this.app = app;
    this.id = 'AbstractScreen';

    this.flashState = 0;
    this.now = Date.now();

    this.borderView = null;
    this.borderWidth = 0;
    this.borderHeight = 0;
    this.minimalBorder = 0;
    this.optimalBorder = 0;
    if (this.app.platform.border(this.app) !== false) {
      this.minimalBorder = this.app.platform.border(this.app)['minimal'];
      this.optimalBorder = this.app.platform.border(this.app)['optimal'];
    }

    this.desktopView = null;
    this.desktopWidth = this.app.platform.desktop(this.app)['width'];
    this.desktopHeight = this.app.platform.desktop(this.app)['height'];

    this.messages = [];
  } // constructor

  init() {
    if (this.app.platform.border(this.app) !== false) {
      this.borderView = new BorderView(null, 0, 0, 0, 0);
      this.borderView.app = this.app;
      this.borderView.screen = this;
      this.borderView.bkColor = this.app.platform.border(this.app)['defaultColor'];
      var viewObjects = this.app.platform.initView(this.borderView);
      if (viewObjects !== false) {
        this.borderView.stack = {...this.borderView.stack, ...viewObjects};
      }
      }
    this.desktopView = new DesktopView(null, 0, 0, 0, 0);
    this.desktopView.app = this.app;
    this.desktopView.screen = this;
    this.desktopView.bkColor = this.app.platform.desktop(this.app)['defaultColor'];
    var viewObjects = this.app.platform.initView(this.desktopView);
    if (viewObjects !== false) {
      this.desktopView.stack = {...this.desktopView.stack, ...viewObjects};
    }
  } // init

  sendEvent(timing, message) {
    if (timing == 0) {
      this.handleEvent(message);
    } else {
      this.messages.push({'id': message['id'], 'timing': this.now+timing, 'message': message});
    }
  } // sendEvent

  cancelEvent(id) {
    for (var m = 0; m < this.messages.length; m++) {
      if (id == this.messages[m]['id']) {
        this.messages.splice(m, 1);
      }
    }
  } // cancelEvent

  handleEvent(message) {
    var result = false;
    if (this.borderView != null) {
      result = this.borderView.handleEvent(message);
    }
    if (result == false) {
      this.desktopView.handleEvent(message);
    }
  } // handleEvent

  setData(data) {
    if (this.borderView != null) {
      this.borderView.setData(data);
    }
    this.desktopView.setData(data);
    this.drawScreen();
  } // setData

  loopScreen() {
    this.now = Date.now();
    for (var m = 0; m < this.messages.length; m++) {
      if (this.messages[m]['timing'] <= this.now) {
        this.sendEvent(0, this.messages[m]['message']);
        this.messages.splice(m, 1);
      }
    }
  } // loopScreen

  resizeScreen() {
    this.desktopWidth = this.app.platform.desktop(this.app)['width'];
    this.desktopHeight = this.app.platform.desktop(this.app)['height'];
    this.app.layout.resizeScreen(this);
    this.drawScreen();
  } // resizeScreen

  drawScreen() {
    if (this.borderView != null) {
      this.borderView.drawView();
    }
    this.desktopView.drawView();
  } // drawScreen

} // class AbstractScreen

export default AbstractScreen;
