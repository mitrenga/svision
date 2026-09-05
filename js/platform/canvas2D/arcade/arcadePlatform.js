const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { ArcadeLayout } = await import('./arcadeLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for a raster arcade monitor. The logical screen is a
 * fixed-size raster (e.g. Space Invaders and Stinger 224x256, Pleiads 208x256,
 * portrait) surrounded by a bezel; the layout scales it by an integer factor
 * and paints an optional color overlay (the cellophane strips of the original
 * cabinet) over the desktop. Shared by all raster arcade remakes and
 * configured per game from the project's appPlatform.js:
 *
 *   {
 *     width, height,        logical raster size in pixels
 *     bezelColor,           color around the screen (default black)
 *     screenColor,          desktop background (default black)
 *     minimalBorder,        minimal bezel width in logical pixels
 *     overlay: {            optional color overlay
 *       enabled: true,
 *       bands: [{x, y, width, height, color}, ...]   rectangles in logical
 *                           desktop coordinates, multiplied over the picture
 *     }
 *   }
 *
 * Unlike ZXSpectrumPlatform it does not fill app.stack.ButtonEntity
 * (hover/click colors per button color): the arcade UI gets no hover palette
 * for now; a platform-independent mechanism (config.buttonColors) is planned
 * for both platforms.
 */
export class ArcadePlatform extends Canvas2DPlatform {

  constructor(config) {
    super();
    this.config = Object.assign({
      width: 224,
      height: 256,
      bezelColor: '#000000',
      screenColor: '#000000',
      minimalBorder: 0,
      overlay: {enabled: false, bands: []}
    }, config || {});
  } // constructor

  platformName() {
    return 'Arcade '+this.config.width+'x'+this.config.height+' [HTML canvas 2D]';
  } // platformName

  newLayout(app) {
    return new ArcadeLayout(app, this.config);
  } // newLayout

  desktop(app) {
    return {width: this.config.width, height: this.config.height, defaultColor: this.config.screenColor};
  } // desktop

  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: this.config.bezelColor};
  } // border

} // ArcadePlatform
