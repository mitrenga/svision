/**/
const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { WebGL2Layout } = await import('./webGL2Layout.js?ver='+window.srcVersion);
/*/
import AbstractPlatform from '../../abstractPlatform.js';
import WebGL2Layout from './webGL2Layout.js';
/**/
// begin code

export class WebGL2Platform extends AbstractPlatform {
  
  constructor() {
    super();
  } // constructor

  platformName() {
    return 'WebGL2';
  } // platformName
  
  initCanvasElement(app, parentElementID) {
    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('canvas');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp');
    app.element.style.cursor = 'pointer';
    app.parentElement.appendChild(app.element);
    app.stack.ctx = app.element.getContext('webgl2');
    app.stack.containerType = 'webGL2';
  } // initCanvasElement

  initEntity(entity) {
  } // initEntity

  defaultLayout(app) {
    return new WebGL2Layout(app);
  } // defaultLayout

  desktop(app) {
    return {'width': app.element.clientWidth, 'height': app.element.clientHeight, 'defaultColor': false};
  } // desktop

} // class WebGL2Platform

export default WebGL2Platform;
