const { AspectLayout } = await import('../aspectLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of {@link Atari8Platform}: the 320x240 frame scaled by a whole
 * number from 2x up, fractional between 1x and 2x, the border around it —
 * {@link AspectLayout} under the platform's name, `pixelAspect` 1 by default.
 */
export class Atari8Layout extends AspectLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config, see {@link Atari8Platform}.
   */
  constructor(app, config) {
    super(app, config);
    this.id = 'Atari8Layout';
  } // constructor

} // Atari8Layout
