const { C64DialogProperties } = await import('./c64DialogProperties.js?ver='+window.srcVersion);
const { SettingsEntity } = await import('../dialogs/settingsEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Commodore 64 look of SettingsEntity: the properties are completed from
 * C64DialogProperties, so the panel is in the machine's 8x8 font with its
 * window of 288 x 176. A thin wrapper (R-056), the constructor is
 * SettingsEntity's.
 */
export class C64SettingsEntity extends SettingsEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   * @param {Object} [properties] - The dialog properties, see C64DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    super(parentEntity, x, y, width, height, options, C64DialogProperties.merge(properties));
    this.id = 'C64SettingsEntity';
  } // constructor

} // C64SettingsEntity
