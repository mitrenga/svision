const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
const { RemapKeysEntity } = await import('../dialogs/remapKeysEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of RemapKeysEntity: the properties are completed from
 * the `remapKeys` part of ZXDialogProperties. A thin wrapper (R-056).
 */
export class ZXRemapKeysEntity extends RemapKeysEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {Object} options - Device definition with its name and list of remappable keys.
   * @param {Object} [properties] - The `remapKeys` dialog properties, see ZXDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    super(parentEntity, x, y, width, height, options, ZXDialogProperties.merge(properties, 'remapKeys'));
    this.id = 'ZXRemapKeysEntity';
  } // constructor

} // ZXRemapKeysEntity
