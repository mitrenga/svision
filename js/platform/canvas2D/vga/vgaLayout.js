const { AspectLayout } = await import('../aspectLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of {@link VGAPlatform}: the 320x200 raster of mode 13h on a 4:3
 * monitor, a pixel 1.2 times taller than wide. It is {@link AspectLayout}
 * under the platform's name — the two-ratio fit was written here first and
 * moved up when the C64 and Atari platforms needed the same (R-039).
 */
export class VGALayout extends AspectLayout {

  /**
   * @param {Object} app - The application instance.
   * @param {Object} config - The platform config, see {@link VGAPlatform}.
   */
  constructor(app, config) {
    super(app, config);
    this.id = 'VGALayout';
  } // constructor

} // VGALayout
