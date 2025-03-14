/**/

/*/

/**/
// begin code

export class AbstractLayout {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractLayout';
  } // constructor

  canvas() {
    return false;
  } // canvas
  
  colorByName(colorName) {
    return false;
  } // colorByName

  color(color) {
    return false;
  } // color

  resizeScreen(screen) {
  } // resizeScreen

} // class AbstractLayout

export default AbstractLayout;
