/**/

/*/

/**/
// begin code

export class AbstractPlatform {
  
  constructor() {
  } // constructor

  platformName() {
    return 'AbstractPlatform';
  } // platformName
  
  initCanvasElement(app, parentElementID) {
  } // initCanvasElement

  initEntity(entity) {
    return false;
  } // initEntity

  newLayout(app) {
    return false;
  } // newLayout

  desktop(app) {
    return {width: 0, height: 0, defaultColor: false};
  } // resolution

  border(app) {
    return false;
  } // border

} // AbstractPlatform

export default AbstractPlatform;
