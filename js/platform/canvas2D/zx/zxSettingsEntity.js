const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
const { SettingsEntity } = await import('../dialogs/settingsEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of SettingsEntity: the properties are completed from
 * ZXDialogProperties — Manic Miner's colours, the 5x5 fonts, the touch
 * pictograms bright blue on bright yellow. A thin wrapper (R-056), the
 * constructor is SettingsEntity's.
 */
export class ZXSettingsEntity extends SettingsEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   * @param {Object} [properties] - The dialog properties, see ZXDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    super(parentEntity, x, y, width, height, options, ZXDialogProperties.merge(properties));
    this.id = 'ZXSettingsEntity';
  } // constructor

} // ZXSettingsEntity
