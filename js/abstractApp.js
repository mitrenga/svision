/**/

/*/

/**/
// begin code

export class AbstractApp {
  
  constructor(platform, parentElement, wsURL) {
    this.parentElement = false;
    this.element = false;
    this.now = 0;
    this.model = false;
    this.stack = {};
    this.platform = platform;
    this.platform.initCanvasElement(this, parentElement);

    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = 100;
    this.offscreenCanvas.height = 100;
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


  // events processing

  eventKeyDown(event) {
    if (this.model) {
      this.model.sendEvent(0, {'id': 'keyPress', 'key': event.key});
    }
  } // eventKeyDown

  eventKeyUp(event) {
    if (this.model) {
      this.model.sendEvent(0, {'id': 'keyRelease', 'key': event.key});
    }
  } // eventKeyUp

  eventMouseClick(event, key) {
    event.preventDefault();
    if (this.model) {
      this.model.sendEvent(0, {'id': 'mouseClick', 'key': key, 'x': this.layout.convertClientCoordinateX(event.clientX), 'y': this.layout.convertClientCoordinateY(event.clientY)});
    }
  } // eventMouseClick
  
  eventTouchStart(event) {
    event.preventDefault();
    if (this.model) {
      this.model.sendEvent(0, {'id': 'mouseClick', 'key': 'left', 'x': this.layout.convertClientCoordinateX(event.touches[0].clientX), 'y': this.layout.convertClientCoordinateY(event.touches[0].clientY)});
    }
  } // eventTouchStart
  
  eventTouchEnd(event) {
    event.preventDefault();
  } // eventTouchEnd
  
  eventTouchCancel(event) {
    event.preventDefault();
  } // eventTouchCancel

  eventTouchMove(event) {
    event.preventDefault();
  } // eventTouchMove
  
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
