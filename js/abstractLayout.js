/**/

/*/

/**/
// begin code

export class AbstractLayout {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractLayout';
  } // constructor
  
  resizeModel(model) {
  } // resizeModel

  clearCanvas() {
  } // clearCanvas

  convertClientCoordinateX(clientX) {
    return clientX;
  } // convertClientCoordinateX

  convertClientCoordinateY(clientY) {
    return clientY;
  } // convertClientCoordinateY

} // AbstractLayout

export default AbstractLayout;
