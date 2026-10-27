const { TerminalDialogProperties } = await import('./terminalDialogProperties.js?ver='+window.srcVersion);
const { VolumeEntity } = await import('../dialogs/volumeEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The text terminal look of VolumeEntity: the properties are completed from
 * TerminalDialogProperties, so the labels, the buttons and the steps use the
 * terminal's font (`app.fonts.terminal`). A thin wrapper (R-056), the
 * constructor is VolumeEntity's.
 */
export class TerminalVolumeEntity extends VolumeEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} bus - The audio bus identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   * @param {Object} [properties] - The dialog properties, see TerminalDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, properties = {}) {
    super(parentEntity, x, y, width, height, bus, cookie, sampleSound, TerminalDialogProperties.merge(properties));
    this.id = 'TerminalVolumeEntity';
  } // constructor

} // TerminalVolumeEntity
