const { Atari8DialogProperties } = await import('./atari8DialogProperties.js?ver='+window.srcVersion);
const { PlayerNameEntity } = await import('../dialogs/playerNameEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Atari 8-bit look of PlayerNameEntity: the properties are completed from
 * Atari8DialogProperties, so the prompt, the input and the keys are in the
 * machine's 8x8 font and the wide keys' labels in 5x5, on the plain
 * keyboard of the dialog. A thin wrapper (R-056), the constructor is
 * PlayerNameEntity's.
 */
export class Atari8PlayerNameEntity extends PlayerNameEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see Atari8DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    super(parentEntity, x, y, width, height, autoStartGame, Atari8DialogProperties.merge(properties));
    this.id = 'Atari8PlayerNameEntity';
  } // constructor

} // Atari8PlayerNameEntity
