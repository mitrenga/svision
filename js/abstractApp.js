/**/
const { InputEventsManager } = await import('./inputEventsManager.js?ver='+window.srcVersion);
/*/
import InputEventsManager from './inputEventsManager.js';
/**/
// begin code

export class AbstractApp {
  
  constructor(platform, parentElement, importPath, wsURL) {
    this.parentElement = false;
    this.element = false;
    this.importPath = importPath;
    this.now = 0;
    this.inputEventsManager = new InputEventsManager(this);
    this.audioManager = false;
    this.model = false;
    this.stack = {};
    this.platform = platform;
    this.platform.initCanvasElement(this, parentElement);

    this.layout = platform.newLayout(this);
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
  
  eventResizeWindow(event) {
    this.resizeApp();
  } // eventResizeWindow


  // tools

  hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  intToHex(intNum, length) {
    return intNum.toString(16).padStart(length, '0').toUpperCase();
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

  setCookie(name, value) {
    document.cookie=name+'='+value+';max-age=31536000;path=/';
  } // setCookie

  getCookie(name, defaultValue) {
    var regex = new RegExp('(^| )'+name+'=([^;]+)');
    var match = document.cookie.match(regex);
    if (match) {
      return match[2];
    }
    return defaultValue;
  } // getCookie

} // AbstractApp

export default AbstractApp;
