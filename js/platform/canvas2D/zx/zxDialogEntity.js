const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { DialogEntity } = await import('../dialogs/dialogEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The window of the ZX Spectrum themed dialogs: DialogEntity with the ZX
 * colours when the properties leave them out (black frame, bright white
 * title). A thin wrapper (R-056); the ZX games keep opening their windows
 * through it, the properties come from ZXDialogProperties.
 */
export class ZXDialogEntity extends DialogEntity {

  /**
   * @param {AbstractEntity} parentEntity - The owner the window sits on.
   * @param {number} x - X position of the window.
   * @param {number} y - Y position of the window.
   * @param {number} width - Window width.
   * @param {number} height - Window height.
   * @param {string|false} title - The text of the title bar, false for a window without one.
   * @param {Object} properties - See DialogEntity and ZXDialogProperties.
   * @param {Function} contentFactory - Called with the window, returns the contents entity.
   */
  constructor(parentEntity, x, y, width, height, title, properties, contentFactory) {
    super(parentEntity, x, y, width, height, title, Object.assign({frameColor: ZXColor.black, titleColor: ZXColor.brightWhite}, properties || {}), contentFactory);
    this.id = 'ZXDialogEntity';
  } // constructor

} // ZXDialogEntity
