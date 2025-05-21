/**/
const { InputEventsManager } = await import('./inputEventsManager.js?ver='+window.srcVersion);
/*/
import InputEventsManager from './inputEventsManager.js';
/**/
// begin code

export class AbstractApp {
  
  constructor(platform, parentElement, wsURL) {
    this.parentElement = false;
    this.element = false;
    this.now = 0;
    this.inputEventsManager = new InputEventsManager(this);
    this.model = false;
    this.stack = {};
    this.platform = platform;
    this.platform.initCanvasElement(this, parentElement);

    this.layout = platform.defaultLayout(this);
    this.wsURL = wsURL;
    this.webSocket = false;
  } // constructor

  loopApp(timestamp) {
    this.now = timestamp;
    if (this.model) {
      this.model.loopModel(timestamp);
    }
  } // loopApp
  
  resizeApp() {
    if (window.innerHeight != this.element.height) {
      document.documentElement.style.setProperty('--app-height', window.innerHeight+'px');
    }
    if (this.model) {
      this.model.resizeModel();
    }
  } // resizeApp


  // events
  
  eventBlurWindow(event) {
  } // eventBlurWindow

  eventFocusWindow(event) {
  } // eventFocusWindow
  
  eventResizeWindow(event) {
    this.resizeApp();
  } // eventResizeWindow


  // conversion functions

  hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  intToHex(intNum) {
    return intNum.toString(16);
  } // intToHex

  hexToBin(hexNum) {
    return this.hexToInt(hexNum).toString(2).padStart(hexNum.length*4, '0');
  } // hexToBin

  binToInt(binNum) {
    return parseInt(binNum, 2);
  } // hexToBin

  rotateInc(value, min, max) {
    var result = value+1;
    if (result > max) {
      result = min;
    }
    return result;
  } // rotateInc

  rotateDec(value, min, max) {
    var result = value-1;
    if (result < min) {
      result = max;
    }
    return result;
  } // rotateDec

} // class AbstractApp

export default AbstractApp;
