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
  
  colorByName(colorName) {
    return this.platform.colorByName(colorName);
  } // colorByName
  
  color(color) {
    return this.platform.color(color);
  } // color

  penColorByAttribut(attr) {
    return this.platform.penColorByAttribut(attr);
  } // penColorByAttribut

  bkColorByAttribut(attr) {
    return this.platform.bkColorByAttribut(attr);
  } // bkColorByAttribut

} // class AbstractApp

export default AbstractApp;
