/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { HTMLLayout } = await import('./htmlLayout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import HTMLLayout from './htmlLayout.js';
/**/
// begin code

export class HTMLPlatform extends AbstractPlatform {
  
  constructor() {
    super();
  } // constructor

  platformName() {
    return 'HTML5';
  } // platformName
  
  initCanvasElement(app, parentElementID) {
    app.parentElement = document.getElementById(parentElementID);
    app.element = document.createElement('div');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.parentElement.appendChild(app.element);
    app.stack['containerType'] = 'html';
  } // initCanvasElement

  initView(view) {
    var parentElement = null;
    if (view.parentView == null) {
      parentElement = view.app.element;
    } else {
      parentElement = view.parentView.stack['element'];
    }
    var element = document.createElement('div');
    element.id = view.id;
    element.style.position = 'absolute';
    parentElement.appendChild(element);
    return {'element': element};
  } // initView


  defaultLayout(app) {
    return new HTMLLayout(app);
  } // defaultLayout

  desktop() {
    return {width: 256, height: 192, defaultColor: this.colorByName('white')};
  } // desktop

  border() {
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

} // class HTMLPlatform

export default HTMLPlatform;
