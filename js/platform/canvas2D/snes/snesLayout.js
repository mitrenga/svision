const { AspectLayout } = await import('../aspectLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of {@link SNESPlatform}: the 256×224 picture scaled by a whole
 * number from 2x up, fractional between 1x and 2x, drawn at 1x and shrunk
 * by CSS below, the black surround around it — {@link AspectLayout} under
 * the platform's name. `pixelAspect` comes from the platform config: a
 * pixel of the NTSC console on a 4:3 television was about **8:7** taller
 * than wide (256 pixels across the picture, 224 lines down it), which is
 * what the platform defaults to; the value is an open point of R-050 the
 * operator settles by eye.
 */
export class SNESLayout extends AspectLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config, see {@link SNESPlatform}.
   */
  constructor(app, config) {
    super(app, config);
    this.id = 'SNESLayout';
  } // constructor

} // SNESLayout
