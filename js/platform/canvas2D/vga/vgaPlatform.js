const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { VGALayout } = await import('./vgaLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for a PC with a VGA card and a 4:3 monitor — the machine
 * the DOS games of 1989-1993 ran on (Prince of Persia, the Gobliiins). The
 * logical screen is **mode 13h, 320x200 pixels of 256 colours** — of all the
 * modes a VGA card has, the one DOS games used far more than any other: one
 * byte per pixel in a flat 64000-byte memory, a palette of 256 colours out of
 * 262144, no planes and no bank switching, so it was both the easiest to draw
 * into and the most colourful the hardware offered at a resolution the CPU of
 * the day could redraw every frame. The other modes (the planar 640x480x16 of
 * mode 12h, the unchained "mode X" 320x240) are not modelled here; a game
 * that needs one would get its own videoram class next to this one. The
 * monitor showed the 200 lines over the same height as 240 square pixels, so
 * a pixel is 1.2 times taller than it is wide, and the layout keeps it that way.
 *
 * The border — everything of the element outside the 320x200 picture — is
 * the black of a monitor showing nothing. A VGA card does have an overscan
 * colour register, but no game of the era set it, so unlike the ZX Spectrum
 * platform the border never changes colour and the games are not given a way
 * to change it: the platform's `border()` is black and that is the end of it.
 *
 * Configured per game from the project's appPlatform.js:
 *
 *   {
 *     width, height,        the mode 13h raster, 320x200 by default
 *     pixelScale,           logical pixels per raster pixel, 1 by default
 *     pixelAspect,          how much taller than wide a pixel is shown;
 *                           1.2 for 320x200 on 4:3, 1 for square pixels
 *     minimalBorder,        minimal border in logical pixels, 0 by default
 *     borderColor,          '#000000' — see above
 *     screenColor           the desktop background, '#000000'
 *   }
 *
 * ## The desktop and the text mode
 *
 * The machine has two pictures on the same 4:3 face: the 320x200 of mode 13h
 * and the 640x400 of the 80x25 text mode it boots in. The desktop is the
 * game's, 320x200, and {@link VGATextModeEntity} fits its 640x400 frame into
 * it by a downscaled blit — which leaves the text a little rough at odd
 * ratios. `pixelScale: 2` makes the desktop 640x400 instead: text 1:1, a mode
 * 13h pixel a 2x2 square ({@link VGAVideoRAMEntity} blits its frame at 2x),
 * but the layout's whole-number steps become twice as coarse for the game
 * (a 1920x959 viewport falls to 1x). Tried both ways on 2026-09-14; the
 * game's picture comes first, so 1 is the default and the text mode waits
 * for a better idea.
 */
export class VGAPlatform extends Canvas2DPlatform {

  /**
   * @param {Object} [config] - The settings above; every key is optional.
   */
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 320,
      height: 200,
      pixelScale: 1,
      pixelAspect: 1.2,
      minimalBorder: 0,
      borderColor: '#000000',
      screenColor: '#000000'
    }, config || {});
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'VGA '+this.config.width+'x'+this.config.height+' [HTML canvas 2D]';
  } // platformName

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {VGALayout} A new VGA layout.
   */
  newLayout(app) {
    return new VGALayout(app, this.config);
  } // newLayout

  /**
   * Returns the desktop: the mode 13h raster times `pixelScale` — 320x200 by
   * default — black until a game paints it.
   * @param {Object} app - The application instance.
   * @returns {Object} The desktop descriptor with width, height and defaultColor.
   */
  desktop(app) {
    return {
      width: this.config.width*this.config.pixelScale,
      height: this.config.height*this.config.pixelScale,
      defaultColor: this.config.screenColor
    };
  } // desktop

  /**
   * How many logical pixels one mode 13h pixel is — what an entity showing
   * the videoram scales its frame by, and what a game divides a pointer
   * position by to get a videoram position.
   * @returns {number} 1 by default.
   */
  get pixelScale() {
    return this.config.pixelScale;
  } // pixelScale

  /**
   * Returns the border: black, of the configured minimal size.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: this.config.borderColor};
  } // border

} // VGAPlatform
