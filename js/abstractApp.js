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

  drawApp() {
    if (this.model) {
      this.model.drawModel();
    }
  } // drawApp
  
  onClick(e) {
  } // onClick
  
  hexToInt(hexData) {
    return parseInt(hexData, 16);
  } // hexToInt

  hexToBin(hexData) {
    return this.hexToInt(hexData).toString(2).padStart(8, '0');
  } // hexToBin

} // class AbstractApp

export default AbstractApp;
