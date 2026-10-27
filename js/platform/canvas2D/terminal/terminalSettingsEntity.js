const { TerminalDialogProperties } = await import('./terminalDialogProperties.js?ver='+window.srcVersion);
const { SettingsEntity } = await import('../dialogs/settingsEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The text terminal look of SettingsEntity: the properties are completed from
 * TerminalDialogProperties, so the panel is in the terminal's own font
 * (`app.fonts.terminal`). A thin wrapper (R-056), the constructor is
 * SettingsEntity's.
 */
export class TerminalSettingsEntity extends SettingsEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   * @param {Object} [properties] - The dialog properties, see TerminalDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    super(parentEntity, x, y, width, height, options, TerminalDialogProperties.merge(properties));
    this.id = 'TerminalSettingsEntity';
  } // constructor

} // TerminalSettingsEntity
