const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { WebGL2Layout } = await import('./webGL2Layout.js?ver='+window.srcVersion);
// begin code

/**
 * The 3D platform (R-032): a WebGL2 canvas with a 2D canvas over it. The
 * application element is a `<div>` holding both, the same size; `stack.gl`
 * is the WebGL2 context of the lower one, `stack.ctx` the 2D context of
 * the upper, transparent one — so everything of `canvas2D/` (text, sprites,
 * dialogs, menus, the CRT display style) works unchanged as the HUD over
 * the 3D picture, which shows through wherever the overlay painted nothing.
 * The desktop entity therefore keeps `bkColor` false.
 *
 * The desktop is a logical rectangle (`width` × `height` model units, the
 * HUD's pixel grid) fitted into the element at a ratio as on the ZX and
 * arcade layouts — `fit: 'contain'` keeps that size and fills the rest
 * with the border, `fit: 'cover'` grows the desktop over the whole window
 * (the model reads `desktopWidth`/`desktopHeight` and lays the HUD out by
 * them; on every resize they may change). The 3D picture is rendered at
 * the device's `pixelRatio`.
 * Without WebGL2 the platform still comes up: `stack.gl` is null and the
 * scenes are drawn as wireframes on the overlay.
 *
 * Options: `width`, `height` (desktop in model units), `defaultColor`
 * (desktop background, false for none — keep it false), `border`
 * (`{minimal, defaultColor}` or false), `background` (the GL clear colour
 * outside every scene and the element's colour), `fit` (`'contain'` |
 * `'cover'`), `antialias` (of the GL context), `pixelRatio` (false for
 * the device's).
 */
export class WebGL2Platform extends AbstractPlatform {

  /**
   * Creates the platform with its options merged over the defaults (a 640 x 360
   * desktop, no desktop colour, a black border and background, 'contain',
   * antialiasing on, the device's pixel ratio).
   * @param {Object} [options] - Any of the keys listed in the class description: `width`, `height`, `defaultColor`, `border`, `background`, `fit`, `antialias`, `pixelRatio`.
   */
  constructor(options) {
    super();
    this.options = Object.assign({
      width: 640,
      height: 360,
      defaultColor: false,
      border: {minimal: 0, defaultColor: '#000000'},
      background: '#000000',
      fit: 'contain',
      antialias: true,
      pixelRatio: false
    }, options || {});
  } // constructor

  /**
   * Names the platform.
   * @returns {string} The platform name, 'WebGL2'.
   */
  platformName() {
    return 'WebGL2';
  } // platformName

  /**
   * Creates the element: a block `<div>` (so `clientWidth` and resize work
   * as for a canvas) with the GL canvas and the 2D overlay stacked in it.
   * Fills `app.stack` with `gl` (null without WebGL2), `glCanvas`,
   * `overlayCanvas`, `ctx` (the overlay's 2D context) and `containerType`.
   * @param {AbstractApp} app - The application the element is created for.
   * @param {string} parentElementID - Id of the DOM element that hosts it.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);

    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('div');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp', 'glApp');
    app.element.style.cursor = 'pointer';
    app.element.style.background = this.options.background;
    app.element.style.overflow = 'hidden';
    app.parentElement.appendChild(app.element);

    var glCanvas = document.createElement('canvas');
    glCanvas.classList.add('glCanvas');
    var overlay = document.createElement('canvas');
    overlay.classList.add('overlayCanvas');
    [glCanvas, overlay].forEach((canvas) => {
      canvas.style.position = 'absolute';
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      canvas.style.margin = '0';
      canvas.style.padding = '0';
      canvas.style.border = '0';
      canvas.style.display = 'block';
      app.element.appendChild(canvas);
    });

    var gl = null;
    try {
      gl = glCanvas.getContext('webgl2', {antialias: this.options.antialias, alpha: false, depth: true, premultipliedAlpha: true});
    } catch (error) {
      gl = null;
    }
    if (!gl && window.console) {
      console.warn('WebGL2Platform: no WebGL2 context, scenes are drawn as wireframes on the overlay');
    }

    app.stack.gl = gl;
    app.stack.glCanvas = glCanvas;
    app.stack.overlayCanvas = overlay;
    app.stack.ctx = overlay.getContext('2d');
    app.stack.containerType = 'webGL2';
  } // initCanvasElement

  /**
   * Creates the layout of the platform.
   * @param {AbstractApp} app - The application the layout belongs to.
   * @returns {WebGL2Layout} A new layout drawing the HUD on the overlay and the scenes in GL.
   */
  newLayout(app) {
    return new WebGL2Layout(app);
  } // newLayout

  /**
   * Describes the desktop: its logical size in model units and its colour.
   * @param {AbstractApp} app - The application asking (unused, the options decide).
   * @returns {{width: number, height: number, defaultColor: string|false}} The `width`, `height` and `defaultColor` options.
   */
  desktop(app) {
    return {width: this.options.width, height: this.options.height, defaultColor: this.options.defaultColor};
  } // desktop

  /**
   * Describes the border around the desktop.
   * @param {AbstractApp} app - The application asking (unused, the options decide).
   * @returns {{minimal: number, defaultColor: string}|false} The `border` option: its minimal width and colour, or false for no border.
   */
  border(app) {
    return this.options.border;
  } // border

} // WebGL2Platform
