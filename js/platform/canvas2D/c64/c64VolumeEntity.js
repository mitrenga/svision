const { C64DialogProperties } = await import('./c64DialogProperties.js?ver='+window.srcVersion);
const { VolumeEntity } = await import('../dialogs/volumeEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Commodore 64 look of VolumeEntity: the properties are completed from
 * C64DialogProperties, so the step buttons use `app.fonts.c64Fonts8x8`. A
 * thin wrapper (R-056), the constructor is VolumeEntity's.
 */
export class C64VolumeEntity extends VolumeEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} bus - The audio bus identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   * @param {Object} [properties] - The dialog properties, see C64DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, properties = {}) {
    super(parentEntity, x, y, width, height, bus, cookie, sampleSound, C64DialogProperties.merge(properties));
    this.id = 'C64VolumeEntity';
  } // constructor

} // C64VolumeEntity
