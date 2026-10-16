const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { Atari8Layout } = await import('./atari8Layout.js?ver='+window.srcVersion);
const { Atari8Color } = await import('./atari8Color.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for the Atari 8-bit computers — the 400/800/XL/XE
 * family, which shares ANTIC, GTIA and the players and missiles; the
 * reference machine is an 800XL on a PAL television (64 KB, OS rev. 2). The desktop is the **320x240 frame** ANTIC can display at
 * normal playfield width ({@link Atari8Screen}); the border around it is
 * COLBK, the same register that colours the background inside, so a model
 * that sets COLBK sets `borderEntity.bkColor` with it. The machine boots
 * with a black border and a blue Graphics 0 screen inside it.
 *
 * The picture is whatever the display list says: text mode 2, the tile mode
 * 4 and players and missiles in this step; sound (POKEY) is a separate step.
 *
 * Configured per game from the project's appPlatform.js:
 *
 *   {
 *     width, height,        the window of the frame shown on the desktop,
 *                           320x240 by default — the whole of it. ANTIC
 *                           always makes 240 scan lines; a game whose
 *                           display list covers fewer sets `height` and
 *                           `firstLine` to the lines it draws, and the rest
 *                           of the frame becomes border instead of a band
 *                           inside the picture (a television hid those lines
 *                           under overscan). It buys a whole step of the
 *                           integer ratio on a small display
 *     firstLine,            the first scan line of the frame shown, 0
 *     pixelScale,           logical pixels per raster pixel, 1 by default
 *     pixelAspect,          how much taller than wide a pixel is shown, 1
 *     minimalBorder,        minimal border in logical pixels, 8 by default:
 *                           a PAL machine showed a wide one, but the frame
 *                           is already 320x240 of the 320x288 the beam
 *                           draws, so most of it is inside the picture
 *                           already; 8 still reads as a border and costs no
 *                           step of the integer ratio worth having
 *     borderColor,          COLBK at power-on, black
 *     screenColor           the desktop under the frame, black
 *   }
 */
export class Atari8Platform extends Canvas2DPlatform {

  /**
   * @param {Object} [config] - The settings above; every key is optional.
   */
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 320,
      height: 240,
      firstLine: 0,
      pixelScale: 1,
      pixelAspect: 1,
      minimalBorder: 8,
      borderColor: Atari8Color.color(Atari8Color.OS_COLOR4),
      screenColor: Atari8Color.color(Atari8Color.OS_COLOR4)
    }, config || {});
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'Atari 8-bit [HTML canvas 2D]';
  } // platformName

  /**
   * Initialises the canvas element and gives the buttons hover and click
   * colours in the same hue: hover moves the luminance by 4 (up, or down
   * from 12 and above), click by 8 (up, or down from 8 and above), so every
   * one of the 256 colours has a visible hover and click.
   * @param {Object} app - The application instance.
   * @param {string} parentElementID - The id of the parent DOM element to host the canvas.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);

    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    for (var value = 0; value < 256; value++) {
      var color = Atari8Color.color(value);
      var lum = value & 15;
      app.stack.ButtonEntity.hoverColor[color] = Atari8Color.color((value & 0xF0) | (lum >= 12 ? lum-4 : lum+4));
      app.stack.ButtonEntity.clickColor[color] = Atari8Color.color((value & 0xF0) | (lum >= 8 ? lum-8 : lum+8));
    }
  } // initCanvasElement

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {Atari8Layout} A new layout.
   */
  newLayout(app) {
    return new Atari8Layout(app, this.config);
  } // newLayout

  /**
   * Returns the desktop: the frame, black until a screen paints it.
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
   * The window of the machine's 240 scan line frame the screen entity shows.
   * {@link Atari8ScreenEntity} asks for it when it is made.
   * @returns {Object} `firstLine` and `lines`.
   */
  frameWindow() {
    return {firstLine: this.config.firstLine, lines: this.config.height};
  } // frameWindow

  /**
   * How many logical pixels one raster pixel is; 1 on this platform.
   * @returns {number} The pixel scale.
   */
  get pixelScale() {
    return this.config.pixelScale;
  } // pixelScale

  /**
   * Returns the border: COLBK at power-on, of the configured minimal size.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: this.config.borderColor};
  } // border

} // Atari8Platform
