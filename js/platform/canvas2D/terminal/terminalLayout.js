const { AspectLayout } = await import('../aspectLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of {@link TerminalPlatform}: the frame of the terminal's screen scaled
 * by a whole number horizontally and by that times the pixel aspect
 * vertically. A terminal raster is wide and flat — the 800x275 of the
 * 15IE-00-013 filled a 4:3 face, so its pixel is about twice as tall as wide —
 * and the aspect comes from the application with the rest of the terminal
 * (R-061). It is {@link AspectLayout} under the platform's name, with one
 * difference:
 *
 * **Whole numbers only, from 1x up.** A glyph is a handful of dots, and
 * between 1x and 2x nearest-neighbour scaling makes some dot columns one
 * device pixel wider than others — every stroke of the font a different
 * width. The terminal stays at the largest whole ratio and leaves the rest of
 * the element to the border, which nothing draws into. With a whole pixel
 * aspect (2 for the 15IE) every dot is then the same block of device pixels.
 * Below 1x (phones) it is {@link AspectLayout}'s: drawn at 1x and shrunk by
 * the browser.
 */
export class TerminalLayout extends AspectLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config, see {@link TerminalPlatform}.
   */
  constructor(app, config) {
    super(app, config);
    this.id = 'TerminalLayout';
  } // constructor

  /**
   * A whole number from 1x up; below 1x the canvas is drawn at 1x.
   * @param {number} fit - How many times the desktop with its minimal border fits the element.
   * @returns {number} The horizontal ratio.
   */
  fitRatio(fit) {
    return fit >= 1 ? Math.floor(fit) : 1;
  } // fitRatio

} // TerminalLayout
