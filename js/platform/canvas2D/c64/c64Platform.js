const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { C64Layout } = await import('./c64Layout.js?ver='+window.srcVersion);
const { C64Color } = await import('./c64Color.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for the Commodore 64: the 320x200 picture of the VIC-II
 * inside a border the game can colour. Both the border ($D020) and the
 * background under the text ($D021) are registers of the chip, any of the 16
 * colours, and games changed them all the time — the flashing border of a
 * loader is the machine's signature — so, like the ZX Spectrum platform and
 * unlike the VGA one, the border is a coloured entity the model repaints.
 * The machine boots with a light blue border and a blue background.
 *
 * The picture is the standard text mode of {@link C64TextRAM} plus the
 * hardware sprites of {@link C64SpriteEntity}; the bitmap and multicolour
 * modes are for the first game that needs them (R-038). Sound (SID) is a
 * separate step.
 *
 * Configured per game from the project's appPlatform.js:
 *
 *   {
 *     width, height,        the picture, 320x200 by default
 *     pixelScale,           logical pixels per raster pixel, 1 by default
 *     pixelAspect,          how much taller than wide a pixel is shown;
 *                           1 by default. A PAL pixel was in fact a little
 *                           taller than wide: the 7.881984 MHz dot clock puts
 *                           about 410 pixels across the 52 us active line and
 *                           about 288 lines down the picture, and that over a
 *                           4:3 face makes a pixel 0.9365 as wide as tall,
 *                           so this value is 1/0.9365, about 1.07 — set it
 *                           for that. (The 1.2 of VGA does not apply here:
 *                           there 320x200 fills the face, on a C64 the border
 *                           is part of the picture.)
 *     minimalBorder,        minimal border in logical pixels, 16 by default
 *                           (twice what {@link Atari8Platform} has, whose
 *                           frame carries part of its border already):
 *                           a PAL machine
 *                           showed about 32 on the sides and 35 above and
 *                           below, but a border that wide costs a whole step
 *                           of the integer ratio on a small display, where
 *                           the picture is what matters; 16 still reads as
 *                           a border and the game can ask for more
 *     borderColor,          $D020 at power-on, light blue
 *     screenColor           $D021 at power-on, blue
 *   }
 */
export class C64Platform extends Canvas2DPlatform {

  /**
   * @param {Object} [config] - The settings above; every key is optional.
   */
  constructor(config) {
    super();
    this.config = Object.assign({
      width: 320,
      height: 200,
      pixelScale: 1,
      pixelAspect: 1,
      minimalBorder: 16,
      borderColor: C64Color.lightBlue,
      screenColor: C64Color.blue
    }, config || {});
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'Commodore 64 [HTML canvas 2D]';
  } // platformName

  /**
   * Initialises the canvas element and gives the buttons their hover and
   * click colours: a button lights up in white, and a white one in light
   * grey, so every colour of the palette has a visible hover.
   * @param {Object} app - The application instance.
   * @param {string} parentElementID - The id of the parent DOM element to host the canvas.
   */
  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);

    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    C64Color.colorsNames.forEach((name) => {
      var color = C64Color[name];
      app.stack.ButtonEntity.clickColor[color] = C64Color.grey;
      app.stack.ButtonEntity.hoverColor[color] = C64Color.white;
    });
    app.stack.ButtonEntity.hoverColor[C64Color.white] = C64Color.lightGrey;
  } // initCanvasElement

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {C64Layout} A new layout.
   */
  newLayout(app) {
    return new C64Layout(app, this.config);
  } // newLayout

  /**
   * Returns the desktop: the 320x200 picture, in the power-on background colour.
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
   * How many logical pixels one raster pixel is; 1 on this platform.
   * @returns {number} The pixel scale.
   */
  get pixelScale() {
    return this.config.pixelScale;
  } // pixelScale

  /**
   * Returns the border: the power-on colour, of the configured minimal size.
   * The model recolours it through `borderEntity.bkColor`, as $D020 does.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: this.config.borderColor};
  } // border

} // C64Platform
