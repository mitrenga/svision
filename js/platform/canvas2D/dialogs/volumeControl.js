const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
// begin code

/**
 * The logic of a volume dialog without its drawing, shared by VolumeEntity
 * (canvas 2D) and VectorVolumeEntity (R-056): the user level 0..10 of an
 * audio bus, kept in `app.audioManager.volume[bus]` and in a cookie, the
 * sample sound to judge it by, and the events the dialog sends to the model
 * (`openAudioBus`, `playSound`, `closeAudioBus`, `refreshMenu`). The entity
 * that owns the control draws the level and calls in; the control never
 * touches the display, so it loads in Node.
 *
 * Playing the sample opens the sample's bus (`sampleBus`, the volume's bus
 * unless told otherwise) and the manager's `refreshVolume(bus)`, when it has
 * one, follows every change while the bus is open; closing closes the bus
 * again (R-024: the menu is silent) and sends `refreshMenu` to the model, so
 * a menu showing the level updates.
 */
export class VolumeControl {

  /**
   * @param {AbstractEntity} entity - The dialog entity: its `app` and `sendEvent` are used.
   * @param {string} bus - The volume key in `audioManager.volume` (and the bus, unless `sampleBus`).
   * @param {string} cookie - The cookie the level is kept in.
   * @param {*} sampleSound - The sound played as the sample.
   * @param {string} [sampleBus] - The bus the sample plays on; the volume's bus by default.
   */
  constructor(entity, bus, cookie, sampleSound, sampleBus = bus) {
    this.entity = entity;
    this.bus = bus;
    this.cookie = cookie;
    this.sampleSound = sampleSound;
    this.sampleBus = sampleBus;
  } // constructor

  /**
   * The level as a menu row shows it (the same words as the dialog's
   * buttons): OFF, 10%..90%, MAX.
   * @param {number} level - 0..10
   * @returns {string}
   */
  static levelText(level) {
    if (level <= 0) {
      return 'OFF';
    }
    if (level >= 10) {
      return 'MAX';
    }
    return (level*10)+'%';
  } // levelText

  /**
   * Clamps a level to 0..10, whole.
   * @param {number} level
   * @returns {number}
   */
  static clamp(level) {
    return Math.min(10, Math.max(0, Math.round(Number(level) || 0)));
  } // clamp

  /**
   * The manager of the app, or null without one.
   * @returns {Object|null}
   */
  manager() {
    return (this.entity.app && this.entity.app.audioManager) ? this.entity.app.audioManager : null;
  } // manager

  /**
   * The level as it stands, 0..10.
   * @returns {number}
   */
  level() {
    var manager = this.manager();
    return VolumeControl.clamp(manager ? manager.volume[this.bus] : 0);
  } // level

  /**
   * Sets the level: clamped, kept in the manager and the cookie, and applied
   * to the sample's bus when the manager can refresh an open bus.
   * @param {number} level - The requested level, clamped to 0..10.
   * @returns {number} The level set.
   */
  set(level) {
    level = VolumeControl.clamp(level);
    var manager = this.manager();
    if (manager) {
      manager.volume[this.bus] = level;
      if (typeof manager.refreshVolume === 'function') {
        manager.refreshVolume(this.sampleBus);
      }
    }
    Tool.writeCookie(this.cookie, level);
    return level;
  } // set

  /**
   * Plays the sample: opens its bus and sends the sound.
   * @param {Object} [busOptions] - The options of `openAudioBus` (a canvas 2D dialog passes `{audioSilentHandler: 'disable'}`).
   */
  playSample(busOptions = {}) {
    this.entity.sendEvent(0, 0, {id: 'openAudioBus', bus: this.sampleBus, options: busOptions});
    this.entity.sendEvent(0, 0, {id: 'playSound', sound: this.sampleSound, bus: this.sampleBus, options: false});
  } // playSample

  /**
   * The note about the audio driver after the sample's bus was opened:
   * empty for the worklet, a warning for the deprecated script processor,
   * an error for the silent handler, a note when the level is off.
   * @returns {string}
   */
  driverNote() {
    var manager = this.manager();
    if (!manager) {
      return '';
    }
    if (this.level() == 0) {
      return 'NOTE: AUDIO DRIVER IS OFF';
    }
    var handler = manager.buses[this.sampleBus];
    switch (handler ? handler.id : '') {
      case 'AudioScriptProcessorHandler':
        return 'WARNING: DRIVER IS DEPRECATED!';
      case 'AudioSilentHandler':
        return 'ERROR: AUDIO NOT STARTED!';
    }
    return '';
  } // driverNote

  /**
   * Closes the dialog's audio: the sample's bus goes, the menu is told.
   */
  close() {
    this.entity.sendEvent(0, 0, {id: 'closeAudioBus', bus: this.sampleBus});
    this.entity.sendEvent(0, 0, {id: 'refreshMenu'});
  } // close

} // VolumeControl
