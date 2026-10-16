const { AbstractPlatform } = await import('../../abstractPlatform.js?ver='+window.srcVersion);
const { VectorLayout } = await import('./vectorLayout.js?ver='+window.srcVersion);
// begin code

/**
 * The vector platform: an XY monitor rather than a raster. The application
 * element is a `<div>` holding one `<svg>`; entities draw display lists
 * ({@link VectorEntity}) and the browser renders them at the device's
 * resolution — there is no native pixel grid, so nothing is scaled by an
 * integer ratio and a line stays a line at any size.
 *
 * The desktop is a logical rectangle in model units (the coordinate space of
 * the machine's vector generator, or whatever the application picks); the
 * border fills the rest of the element, as on the raster platforms.
 *
 * Options: `width`, `height` (desktop in model units), `defaultColor`
 * (desktop background, false for none), `border` (`{minimal, defaultColor}`
 * or false for no border entity), `background` (colour of the element
 * behind everything, default black), `overlay` (the coloured cellophane of
 * a cabinet over the monitor: `{bands: [{x, y, width, height, color}]}` in
 * desktop units, multiplied over the picture — a white beam under a green
 * strip is green — or false). Above the overlay there is a third group for
 * what is not on the monitor at all (an entity with `layer = 'top'`: dev-mode
 * indicators, FPS), so its colours stay as they are.
 */
export class VectorPlatform extends AbstractPlatform {

  /**
   * @param {Object} [options]
   */
  constructor(options) {
    super();
    this.options = Object.assign({
      width: 1024,
      height: 768,
      defaultColor: false,
      border: {minimal: 0, defaultColor: '#000000'},
      background: '#000000',
      overlay: false
    }, options || {});
  } // constructor

  /**
   * @returns {string} The platform name.
   */
  platformName() {
    return 'Vector [SVG]';
  } // platformName

  /**
   * Creates the element: a block `<div>` (so `clientWidth` and resize work
   * as for a canvas) with the `<svg>` filling it.
   * @param {AbstractApp} app
   * @param {string} parentElementID
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);

    app.parentElement = document.getElementById(parentElementID);
    app.parentElement.innerText = '';
    app.element = document.createElement('div');
    app.element.id = 'canvasApp';
    app.element.classList.add('canvasApp', 'vectorApp');
    app.element.style.cursor = 'pointer';
    app.element.style.background = this.options.background;
    app.element.style.overflow = 'hidden';
    app.parentElement.appendChild(app.element);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';
    app.element.appendChild(svg);

    // the picture goes into one group, the overlay stays above it
    var content = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    content.setAttribute('class', 'vectorContent');
    svg.appendChild(content);
    var overlay = null;
    if (this.options.overlay && this.options.overlay.bands) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.setAttribute('class', 'vectorOverlay');
      overlay.style.mixBlendMode = 'multiply';
      overlay.style.pointerEvents = 'none';
      this.options.overlay.bands.forEach((b) => {
        var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', b.x);
        r.setAttribute('y', b.y);
        r.setAttribute('width', b.width);
        r.setAttribute('height', b.height);
        r.setAttribute('fill', b.color);
        overlay.appendChild(r);
      });
      svg.appendChild(overlay);
    }
    // the layer above the cellophane: entities with `layer = 'top'`
    var top = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    top.setAttribute('class', 'vectorTop');
    svg.appendChild(top);

    app.stack.ctx = null;
    app.stack.svg = svg;
    app.stack.svgContent = content;
    app.stack.svgOverlay = overlay;
    app.stack.svgTop = top;
    app.stack.containerType = 'vector';
  } // initCanvasElement

  /**
   * @param {AbstractApp} app
   * @returns {VectorLayout}
   */
  newLayout(app) {
    return new VectorLayout(app);
  } // newLayout

  /**
   * @param {AbstractApp} app
   * @returns {{width: number, height: number, defaultColor: string|false}}
   */
  desktop(app) {
    return {width: this.options.width, height: this.options.height, defaultColor: this.options.defaultColor};
  } // desktop

  /**
   * @param {AbstractApp} app
   * @returns {{minimal: number, defaultColor: string}|false}
   */
  border(app) {
    return this.options.border;
  } // border

} // VectorPlatform
