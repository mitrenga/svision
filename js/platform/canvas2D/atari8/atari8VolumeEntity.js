const { Atari8DialogProperties } = await import('./atari8DialogProperties.js?ver='+window.srcVersion);
const { VolumeEntity } = await import('../dialogs/volumeEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Atari 8-bit look of VolumeEntity: the properties are completed from
 * Atari8DialogProperties, so the step buttons use `app.fonts.atari8Fonts8x8`.
 * A thin wrapper (R-056), the constructor is VolumeEntity's.
 */
export class Atari8VolumeEntity extends VolumeEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} bus - The audio bus identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   * @param {Object} [properties] - The dialog properties, see Atari8DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, properties = {}) {
    super(parentEntity, x, y, width, height, bus, cookie, sampleSound, Atari8DialogProperties.merge(properties));
    this.id = 'Atari8VolumeEntity';
  } // constructor

} // Atari8VolumeEntity
