/**/

/*/

/**/
// begin code

export class AbstractApp {
  
  constructor(platform, parentElement, wsURL) {
    this.parentElement = false;
    this.element = false;
    this.screen = false;
    this.stack = {};
    this.platform = platform;
    this.platform.initCanvasElement(this, parentElement);
    this.layout = platform.defaultLayout(this);
    this.wsURL = wsURL;
    this.webSocket = false;
  } // constructor

  loopApp() {
    if (this.screen) {
      this.screen.loopScreen();
    }
  } // loopApp

  resizeApp() {
    if (this.screen) {
      this.screen.resizeScreen();
    }
  } // resizeApp

  drawApp() {
    if (this.screen) {
      this.screen.drawScreen();
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
