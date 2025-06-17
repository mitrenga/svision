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
    return {'width': 0, 'height': 0, 'defaultColor': false};
  } // resolution

  border(app) {
    return false;
  } // border

  colorByName(colorName) {
    return colorName;
  } // colorByName

  color(color) {
    color >>>= 0;
    var b = color & 0xFF;
    var g = (color & 0xFF00) >>> 8;
    var r = (color & 0xFF0000) >>> 16;
    var a = 1; //( (color & 0xFF000000) >>> 24 ) / 255;
    return 'rgba(' + [r, g, b, a].join(',') + ')';
  } // color

} // class AbstractPlatform

export default AbstractPlatform;
