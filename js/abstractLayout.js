/**/

/*/

/**/
// begin code

export class AbstractLayout {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractLayout';
  } // constructor
  
  colorByName(colorName) {
    return false;
  } // colorByName

  color(color) {
    return false;
  } // color

  resizeModel(model) {
  } // resizeModel

  drawEntity(entity) {
  } // drawEntity

} // class AbstractLayout

export default AbstractLayout;
