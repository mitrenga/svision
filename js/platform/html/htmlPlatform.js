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
    app.parentElement.innerText = '';
    app.element = document.createElement('div');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.parentElement.appendChild(app.element);
    app.stack.containerType = 'html';
  } // initCanvasElement

  initEntity(entity) {
    var parentElement = null;
    if (entity.parentEntity == null) {
      parentElement = entity.app.element;
    } else {
      parentElement = entity.parentEntity.stack.element;
    }
    var element = document.createElement('div');
    element.id = entity.id;
    element.style.position = 'absolute';
    parentElement.appendChild(element);
    return {'element': element};
  } // initEntity


  newLayout(app) {
    return new HTMLLayout(app);
  } // newLayout

  desktop(app) {
    return {width: 256, height: 192, defaultColor: this.colorByName('white')};
  } // desktop

} // class HTMLPlatform

export default HTMLPlatform;
