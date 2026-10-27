const { Canvas2DLayout } = await import('./canvas2DLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of a raster on a 4:3 monitor whose pixels need not be square: the
 * picture scaled by a whole number horizontally and by that number times the
 * pixel aspect vertically, centred in the element, the border around it.
 * {@link VGALayout} (aspect 1.2), {@link C64Layout}, {@link Atari8Layout},
 * {@link SNESLayout} and {@link TerminalLayout} (aspect 1 by default) are this
 * class under the platform's name; a platform's config carries `pixelAspect`,
 * and a layout that wants whole ratios only overrides {@link AspectLayout#fitRatio}.
 *
 * ## Why two ratios
 *
 * Every other layout in the library has one `ratio`, because the machines it
 * serves had square pixels or near enough. A VGA monitor showed 320x200 over
 * a 4:3 face, so a pixel was 1.2 times taller than wide; drawn 1:1 the
 * picture is squashed and every circle in Prince of Persia is an egg. The
 * layout keeps the library's single `ratio` for the horizontal direction —
 * every entity, cache and touch control keeps working unchanged — and
 * stretches the main canvas context vertically by the aspect with one
 * `setTransform`, so that the whole entity tree is drawn taller without a
 * line of it knowing.
 *
 * The horizontal ratio is a whole number from 2x up, so a pixel is always the
 * same number of device pixels wide; vertically the rows are `ratio*aspect`
 * device pixels tall, which is a whole number only when `ratio*aspect` is
 * itself a whole number (1600x1200 shows 320x200 at ratio 5, rows 6 device
 * pixels tall, 1.2 exactly). In between, nearest-neighbour
 * scaling makes some rows one device pixel taller — which is precisely what
 * a DOS emulator does with aspect correction on, and what the CRT did with
 * its beam. A platform whose pixels are square sets `pixelAspect: 1` and
 * gets the ZX Spectrum layout's behaviour.
 *
 * Between 1x and 2x the ratio stays fractional so the picture fills the
 * display, as {@link ArcadeLayout} does. Below 1x (phones in portrait) the
 * canvas is drawn at 1x, larger than the element, and the browser shrinks it
 * by CSS — the ZX Spectrum layout's way — so every logical pixel is drawn.
 */
export class AspectLayout extends Canvas2DLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config: `pixelAspect` is read here.
   */
  constructor(app, config) {
    super(app);
    this.id = 'AspectLayout';
    this.config = config;
    /** the vertical ratio: `ratio` times the pixel aspect */
    this.ratioY = 1;
  } // constructor

  /**
   * Recomputes the ratios, border sizes and canvas dimensions to fit the
   * desktop into the element, whatever its shape — the rows stretched by the
   * pixel aspect, the rest of the element left to the border — sets the
   * vertical stretch on the context and repositions the border and desktop
   * entities.
   * @param {Object} model - The model whose desktop and border geometry is being laid out.
   */
  resizeModel(model) {
    var aspect = this.config.pixelAspect > 0 ? this.config.pixelAspect : 1;
    var clientWidth = this.app.element.clientWidth;
    var clientHeight = this.app.element.clientHeight;

    // how the desktop fits the element, fractional
    var fit = clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yFit = clientHeight/((model.desktopHeight+2*model.minimalBorder)*aspect);
    if (yFit < fit) {
      fit = yFit;
    }
    if (!(fit > 0)) {
      fit = 1;   // the element has no size yet (first frame, hidden tab)
    }

    // A whole number from 2x up, the canvas at the element's size. Between
    // 1x and 2x the ratio stays fractional so the picture fills the display
    // (as ArcadeLayout does). Below 1x (phones) the canvas is drawn at 1x —
    // larger than the element — and the browser shrinks it by CSS, as the ZX
    // Spectrum layout does; the borders come from the fractional fit, so the
    // canvas keeps the element's shape and shrinks the same in both directions.
    this.ratio = this.fitRatio(fit);
    if (fit >= 1) {
      fit = this.ratio;
    }
    this.ratioY = this.ratio*aspect;

    model.borderWidth = Math.ceil((clientWidth-model.desktopWidth*fit)/2/fit);
    model.borderHeight = Math.ceil((clientHeight-model.desktopHeight*fit*aspect)/2/(fit*aspect));
    if (model.borderWidth < 0) {
      model.borderWidth = 0;
    }
    if (model.borderHeight < 0) {
      model.borderHeight = 0;
    }

    // resizing the element resets the context state, so the stretch is set
    // afterwards, together with the smoothing applyDisplayStyle() sets
    this.app.element.width = Math.round((model.desktopWidth+2*model.borderWidth)*this.ratio);
    this.app.element.height = Math.round((model.desktopHeight+2*model.borderHeight)*this.ratioY);
    this.applyDisplayStyle();
    this.app.stack.ctx.setTransform(1, 0, 0, aspect, 0, 0);

    if (model.borderEntity != null) {
      model.borderEntity.x = 0;
      model.borderEntity.y = 0;
      model.borderEntity.width = model.desktopWidth+2*model.borderWidth;
      model.borderEntity.height = model.desktopHeight+2*model.borderHeight;
      model.borderEntity.parentWidth = model.borderEntity.width;
      model.borderEntity.parentHeight = model.borderEntity.height;
    }

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.desktopEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
  } // resizeModel

  /**
   * The horizontal ratio for a fractional fit: a whole number from 2x up,
   * the fit itself between 1x and 2x, 1 below. A subclass that wants whole
   * numbers only overrides it ({@link TerminalLayout}).
   * @param {number} fit - How many times the desktop with its minimal border fits the element.
   * @returns {number} The horizontal ratio.
   */
  fitRatio(fit) {
    if (fit >= 2) {
      return Math.floor(fit);
    }
    return fit >= 1 ? fit : 1;
  } // fitRatio

  /**
   * Clears the canvas — the whole of it, which under the vertical stretch
   * means clearing the unstretched height of the element.
   */
  clearCanvas() {
    var ctx = this.app.stack.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.app.element.width, this.app.element.height);
    ctx.restore();
  } // clearCanvas

  /**
   * Converts a client (DOM) Y coordinate into a model Y coordinate, undoing
   * the vertical ratio rather than the horizontal one.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding model Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round(this.app.element.height/this.ratioY/this.app.element.clientHeight*clientY);
  } // convertClientCoordinateY

} // AspectLayout
