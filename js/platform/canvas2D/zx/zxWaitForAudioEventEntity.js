const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
const { WaitForAudioEventEntity } = await import('../dialogs/waitForAudioEventEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of WaitForAudioEventEntity: the properties are
 * completed from ZXDialogProperties (bright white on magenta). A thin
 * wrapper (R-056) for the menus that open the prompt on their desktop.
 */
export class ZXWaitForAudioEventEntity extends WaitForAudioEventEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} continueEvent - The id of the event emitted once a user gesture is received.
   * @param {Object} [properties] - The `waitForAudioEvent` dialog properties, see ZXDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, continueEvent, properties = {}) {
    super(parentEntity, x, y, width, height, continueEvent, ZXDialogProperties.merge(properties, 'waitForAudioEvent'));
    this.id = 'ZXWaitForAudioEventEntity';
  } // constructor

} // ZXWaitForAudioEventEntity
