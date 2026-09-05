/**/
const { Canvas2DLayout } = await import('../canvas2DLayout.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
/*/
import Canvas2DLayout from '../canvas2DLayout.js';
import Tool from '../../../tool.js';
/**/
// begin code

/**
 * Layout of ArcadePlatform: pixel-perfect integer scaling of the logical
 * raster, centered in the element (on a portrait phone the raster fills the
 * display, on a desktop it is a tall window in the middle; the bezel takes
 * the rest and hosts the touch controls). Inherits the sharp/retro (CRT)
 * display style from Canvas2DLayout (SETTINGS > DISPLAY, 'displayStyle'
 * cookie). Adds the color overlay: bands multiplied over the desktop, drawn
 * by paintOverlay() after the desktop content. The overlay switch is stored
 * in the 'overlay' cookie ('on'/'off'); default from the platform config.
 */
export class ArcadeLayout extends Canvas2DLayout {

  constructor(app, config) {
    super(app);
    this.id = 'ArcadeLayout';
    this.config = config;

    var overlayCookie = Tool.readCookie('overlay', false);
    this.overlayEnabled = !!(this.config.overlay && this.config.overlay.enabled);
    if (overlayCookie === 'on' || overlayCookie === 'off') {
      this.overlayEnabled = (overlayCookie === 'on');
    }
  } // constructor

  setOverlayEnabled(enabled) {
    this.overlayEnabled = !!enabled;
    Tool.writeCookie('overlay', this.overlayEnabled ? 'on' : 'off');
  } // setOverlayEnabled

  /**
   * Scaling like the ZX Spectrum layout: from 2x up the ratio is a whole
   * number (pixel-perfect); below 2x (phones in portrait) it stays fractional
   * so the raster fills the display instead of shrinking to 1x.
   */
  resizeModel(model) {
    this.ratio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);
    if (yRatio < this.ratio) {
      this.ratio = yRatio;
    }
    if (this.ratio >= 2) {
      this.ratio = Math.floor(this.ratio);
    }

    model.borderWidth = Math.ceil((this.app.element.clientWidth-model.desktopWidth*this.ratio)/2/this.ratio);
    model.borderHeight = Math.ceil((this.app.element.clientHeight-model.desktopHeight*this.ratio)/2/this.ratio);

    this.app.element.width = Math.round((model.desktopWidth+2*model.borderWidth)*this.ratio);
    this.app.element.height = Math.round((model.desktopHeight+2*model.borderHeight)*this.ratio);
    this.applyDisplayStyle();

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
   * Multiplies the overlay bands over the desktop area. Call it from the
   * model after the desktop entity has been drawn (drawModel override).
   * Bands are clipped to the desktop; a white pixel under a band takes the
   * band color, black stays black — exactly what the cellophane did.
   */
  paintOverlay(model) {
    if (!this.overlayEnabled || !this.config.overlay || !this.config.overlay.bands) {
      return;
    }
    var ctx = this.app.stack.ctx;
    var dx = model.desktopEntity.x;
    var dy = model.desktopEntity.y;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    this.config.overlay.bands.forEach((band) => {
      var x = Math.max(0, band.x);
      var y = Math.max(0, band.y);
      var w = Math.min(model.desktopWidth, band.x+band.width)-x;
      var h = Math.min(model.desktopHeight, band.y+band.height)-y;
      if (w > 0 && h > 0) {
        this.paintRect(ctx, dx+x, dy+y, w, h, band.color);
      }
    });
    ctx.restore();
  } // paintOverlay

} // ArcadeLayout

export default ArcadeLayout;
