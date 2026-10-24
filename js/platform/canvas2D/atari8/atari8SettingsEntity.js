const { Atari8DialogProperties } = await import('./atari8DialogProperties.js?ver='+window.srcVersion);
const { SettingsEntity } = await import('../dialogs/settingsEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Atari 8-bit look of SettingsEntity: the properties are completed from
 * Atari8DialogProperties, so the panel is in the machine's 8x8 font with its
 * window of 288 x 176. A thin wrapper (R-056), the constructor is
 * SettingsEntity's.
 */
export class Atari8SettingsEntity extends SettingsEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   * @param {Object} [properties] - The dialog properties, see Atari8DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    super(parentEntity, x, y, width, height, options, Atari8DialogProperties.merge(properties));
    this.id = 'Atari8SettingsEntity';
  } // constructor

} // Atari8SettingsEntity
