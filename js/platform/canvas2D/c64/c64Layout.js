const { AspectLayout } = await import('../aspectLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of {@link C64Platform}: the 320x200 picture scaled by a whole number
 * from 2x up, fractional between 1x and 2x, drawn at 1x and shrunk by CSS
 * below, with the border around it — {@link AspectLayout} under the
 * platform's name, with `pixelAspect` 1 by default (a PAL pixel was in fact
 * about 1.07 times taller than wide; the platform config can say so).
 */
export class C64Layout extends AspectLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config, see {@link C64Platform}.
   */
  constructor(app, config) {
    super(app, config);
    this.id = 'C64Layout';
  } // constructor

} // C64Layout
