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

  convertClientCoordinateX(clientX) {
    return clientX;
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return clientY;
  } // convertClientCoordinateY

} // class AbstractLayout

export default AbstractLayout;
