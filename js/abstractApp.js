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
    if (this.model) {
      this.model.resizeModel();
    }
  } // resizeApp
  
  onClick(e) {
  } // onClick
  
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

} // class AbstractApp

export default AbstractApp;
