const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { SNESLayout } = await import('./snesLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for the Super Nintendo (R-050): the **256×224**
 * picture the PPU makes of its own memory ({@link SNESPPU}) inside a
 * surround that is always **black** — the console has no border register,
 * outside the picture the television showed nothing. The family of VGA,
 * not of the ZX Spectrum: the models never colour the border.
 *
 * The picture is whatever the game put into VRAM, CGRAM, OAM and the
 * registers; this step models mode 1, the sprites with the chip's limits
 * per line and the master brightness inside the frame — what the first
 * game measured. Sound (the S-DSP and the SPC700) is a separate step.
 *
 * Configured per game from the project's appPlatform.js:
 *
 *   {
 *     width, height,        the picture, 256×224 by default (the NTSC
 *                           picture; a game in overscan would say 239)
 *     pixelScale,           logical pixels per raster pixel, 1 by default
 *     pixelAspect,          how much taller than wide a pixel is shown,
 *                           8/7 by default — the NTSC console's 256 pixels
 *                           across and 224 lines down a 4:3 television make
 *                           a pixel about 8:7; the value is an open point
 *                           of R-050 the operator settles by eye (set 1 for
 *                           square pixels)
 *     minimalBorder,        minimal surround in logical pixels, 0 by
 *                           default: the surround is black and the
 *                           console showed nothing in it, so the picture
 *                           may reach the edge of the element; a game that
 *                           wants a frame (the touch icons live there)
 *                           asks for one
 *   }
 *
 * Unlike the C64 and Atari platforms this one does not fill
 * `app.stack.ButtonEntity` with hover and click colours: there are 32 768
 * colours, the buttons of a game bring their own (as on the arcade
 * platform).
 */
export class SNESPlatform extends Canvas2DPlatform {

  /** the picture of the NTSC console */
  static get WIDTH() { return 256; }
  static get HEIGHT() { return 224; }
  /** the surround — the console has no border colour */
  static get BLACK() { return '#000000'; }

  /**
   * @param {Object} [config] - The settings above; every key is optional.
   */
  constructor(config) {
    super();
    this.config = Object.assign({
      width: SNESPlatform.WIDTH,
      height: SNESPlatform.HEIGHT,
      pixelScale: 1,
      pixelAspect: 8/7,
      minimalBorder: 0
    }, config || {});
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'Super Nintendo [HTML canvas 2D]';
  } // platformName

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {SNESLayout} A new layout.
   */
  newLayout(app) {
    return new SNESLayout(app, this.config);
  } // newLayout

  /**
   * Returns the desktop: the picture, black until the PPU paints it.
   * @param {Object} app - The application instance.
   * @returns {Object} The desktop descriptor with width, height and defaultColor.
   */
  desktop(app) {
    return {
      width: this.config.width*this.config.pixelScale,
      height: this.config.height*this.config.pixelScale,
      defaultColor: SNESPlatform.BLACK
    };
  } // desktop

  /**
   * How many logical pixels one raster pixel is; 1 on this platform.
   * @returns {number} The pixel scale.
   */
  get pixelScale() {
    return this.config.pixelScale;
  } // pixelScale

  /**
   * Returns the surround: black, of the configured minimal size.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: SNESPlatform.BLACK};
  } // border

} // SNESPlatform
