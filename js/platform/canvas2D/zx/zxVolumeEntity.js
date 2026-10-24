const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { SpriteTool } = await import('../../../spriteTool.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXWaitForAudioEventEntity } = await import('./zxWaitForAudioEventEntity.js?ver='+window.srcVersion);
const { ZXDialogEntity } = await import('./zxDialogEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * ZX Spectrum themed dialog entity for adjusting the audio volume of a given
 * bus. It renders a slider with buttons, persists the volume to a cookie,
 * can play a sample sound and reports the active audio driver state.
 *
 * Contents only, no frame and no title (the title used to be the bus name):
 * a game puts it into a window (ZXDialogEntity) or onto its screen and colours
 * it through the `theme` of its dialog properties (ZXDialogProperties). The
 * layout is made for 200 x 124 px and adapts to another width down to 192 px:
 * the side buttons keep their gap from the edge, the rest stays centred (see
 * the constructor). PLAY SAMPLE without the browser's gesture for audio opens
 * ZXWaitForAudioEventEntity in a window placed and coloured by the
 * `waitForAudioEvent` part of the same properties. CLOSE sends a
 * 'contentClosed' event to the parent so a window can close with it.
 */
export class ZXVolumeEntity extends AbstractEntity {

  /**
   * Creates the volume dialog entity for a specific audio bus.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} bus - The audio bus identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   * @param {Object} [properties] - The dialog properties, see ZXDialogProperties; the panel uses `theme` and `waitForAudioEvent`.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, properties = {}) {
    properties = ZXDialogProperties.merge(properties);
    var theme = properties.theme;
    super(parentEntity, x, y, width, height, false, theme.bkColor);
    this.id = 'ZXVolumeEntity';

    this.properties = properties;
    this.theme = theme;
    // whether the nested dialogs (ZXWaitForAudioEventEntity) are
    // clipped to the contents; a game that puts one over the title bar of the
    // window (negative coordinates) sets `clipsChildren: false`
    this.clipsChildren = properties.clipsChildren;
    this.bus = bus;
    this.cookie = cookie;
    this.sampleSound = sampleSound;
    this.cursorEntity = null;
    this.driverEntity = null;
    // the layout is made for 200 px. In another width the buttons at the sides
    // (OFF, -, MAX, +) keep the 2 px gap CLOSE has from the edge, 50% and PLAY
    // SAMPLE stay centred, and the slider with its cursor and the eleven click
    // fields is centred as a whole — the sprite is 181 px at 9, so it keeps the
    // gap down to a width of 192; the click fields may run past the edge, they
    // are invisible
    this.sideMargin = 2;
    this.sliderX = Math.max(-7, Math.floor((width-200)/2));
  } // constructor

  /**
   * Builds the dialog layout: preset and step buttons, the volume slider with
   * its cursor, the play-sample and close buttons and the driver status line.
   */
  init() {
    super.init();


    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 13, this.width, 9, 'CHANGE VOLUME FOR GAME '+this.bus, this.theme.penColor, false, {align: 'center'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.sideMargin, 27, 19, 13, 'OFF', {id: 'setVolume0'}, [], this.theme.buttonPenColor, this.theme.okButtonColor, {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, Math.floor((this.width-19)/2), 27, 19, 13, '50%', {id: 'setVolume5'}, [], this.theme.buttonPenColor, this.theme.okButtonColor, {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-this.sideMargin-21, 27, 21, 13, 'MAX', {id: 'setVolume10'}, [], this.theme.buttonPenColor, this.theme.okButtonColor, {topMargin: 4, leftMargin: 2}));

    var sliderEntity = new SpriteEntity(this, this.sliderX+9, 46, this.theme.sliderColor, false, 0, 0);
    sliderEntity.setGraphicsData(SpriteTool.decode('lP10510070600012H020H530121232123414141414141414141454141414141414141414321232121'));
    this.addEntity(sliderEntity);

    this.cursorEntity = new SpriteEntity(this, this.sliderX+7+this.app.audioManager.volume[this.bus]*18, 42, this.theme.cursorColor, false, 0, 0);
    this.cursorEntity.setGraphicsData(SpriteTool.decode('lP100500F05000501031D012332423321'));
    this.addEntity(this.cursorEntity);


    for(var x = 0; x <= 10; x++) {
      this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.sliderX+2+x*18, 43, 16, 13, '', {id: 'setVolume'+x}, [], false, false, {}));
    }

    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, this.sideMargin, 59, 19, 13, '-', {id: 'changeVolumeDown'}, ['ArrowLeft', '-', 'GamepadLeft'], this.theme.buttonPenColor, this.theme.closeButtonColor, {align: 'center', topMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, this.width-this.sideMargin-21, 59, 21, 13, '+', {id: 'changeVolumeUp'}, ['ArrowRight', '+', 'GamepadRight'], this.theme.buttonPenColor, this.theme.closeButtonColor, {align: 'center', topMargin: 2}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, Math.floor((this.width-67)/2), 81, 67, 13, 'PLAY SAMPLE', {id: 'playSample'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {margin: 4}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-38, this.height-15, 36, 13, 'CLOSE', {id: 'closeVolume'}, ['Escape', 'GamepadExit'], this.theme.buttonPenColor, this.theme.closeButtonColor, {align: 'center', margin: 4}));

    this.driverEntity = new TextEntity(this, this.app.fonts.fonts5x5, 2, this.height-7, this.width-4, 5, '', this.theme.warningColor, false, {});
    this.addEntity(this.driverEntity);
  } // init

  /**
   * The level as a menu row shows it (the same words as the dialog's
   * buttons and as VectorVolumeEntity.levelText): OFF, 10%..90%, MAX.
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
   * Sets the bus volume, clamping it to the range 0-10, persists it to the
   * cookie and repositions the slider cursor.
   * @param {number} volume - The requested volume level (clamped to 0-10).
   */
  changeVolume(volume) {
    this.app.audioManager.volume[this.bus] = Math.min(10, Math.max(0, Math.round(volume)));
    Tool.writeCookie(this.cookie, this.app.audioManager.volume[this.bus]);
    this.cursorEntity.x = this.sliderX+7+this.app.audioManager.volume[this.bus]*18;
  } // changeVolume

  /**
   * Handles the volume dialog events: setting/changing the volume, playing the
   * sample sound (prompting for a user gesture when required), reporting audio
   * errors and closing the dialog.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    if (event.id.substring(0, 9) == 'setVolume') {
      this.changeVolume(Number(event.id.substring(9)));
      return true;
    }
    switch (event.id) {
      case 'changeVolumeUp':
        this.changeVolume(this.app.audioManager.volume[this.bus]+1);
        return true;
      case 'changeVolumeDown':
        this.changeVolume(this.app.audioManager.volume[this.bus]-1);
        return true;
      case 'playSample':
        if (this.app.inputEventsManager.needEventForAudio()) {
          var p = this.properties.waitForAudioEvent;
          this.addModalEntity(new ZXDialogEntity(this, p.x, p.y, p.width, p.height, false, p, (dialog) => new ZXWaitForAudioEventEntity(dialog, dialog.innerX, dialog.innerY, dialog.innerWidth, dialog.innerHeight, 'playSample2', p)));
          return true;
        }
      case 'playSample2':
        this.sendEvent(0, 0, {id: 'openAudioBus', bus: this.bus, options: {audioSilentHandler: 'disable'}});
        if (this.app.audioManager.volume[this.bus] == 0.0) {
          this.driverEntity.setText('NOTE: AUDIO DRIVER IS OFF');
        } else {
          switch (this.app.audioManager.buses[this.bus].id) {
            case 'AudioWorkletHandler':
              this.driverEntity.setText('');
              break;
            case 'AudioScriptProcessorHandler':
              this.driverEntity.setText('WARNING: DRIVER IS DEPRECATED!');
              break;
              case 'AudioSilentHandler':
                this.driverEntity.setText('ERROR: AUDIO NOT STARTED!');
                break;
          }
        }
        this.sendEvent(1, 0, {id: 'closePressAnyKey'});
        this.sendEvent(0, 0, {id: 'playSound', sound: this.sampleSound, bus: this.bus, options: false});
        return true;
      case 'errorAudioBus':
        this.driverEntity.setText(event.error);
        this.app.showErrorMessage(event.error, 'reopen');
        return true;
      case 'closeVolume':
        this.sendEvent(0, 0, {id: 'closeAudioBus', bus: this.bus});
        this.sendEvent(0, 0, {id: 'refreshMenu'});
        this.destroy();
        this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
        return true;
    }
    return false;
  } // handleEvent

} // ZXVolumeEntity
