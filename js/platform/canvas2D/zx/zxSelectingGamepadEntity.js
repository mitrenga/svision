const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
const { SelectingGamepadEntity } = await import('../dialogs/selectingGamepadEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of SelectingGamepadEntity: the properties are
 * completed from the `selectingGamepad` part of ZXDialogProperties (bright
 * white on magenta). A thin wrapper (R-056).
 */
export class ZXSelectingGamepadEntity extends SelectingGamepadEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} selectionGamepad - The id of the gamepad currently selected.
   * @param {Object} [properties] - The `selectingGamepad` dialog properties, see ZXDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, selectionGamepad, properties = {}) {
    super(parentEntity, x, y, width, height, selectionGamepad, ZXDialogProperties.merge(properties, 'selectingGamepad'));
    this.id = 'ZXSelectingGamepadEntity';
  } // constructor

} // ZXSelectingGamepadEntity
