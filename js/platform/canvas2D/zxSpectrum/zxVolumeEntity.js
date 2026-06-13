/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { SpriteTool } = await import('../../../spriteTool.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXWaitForAudioEventEntity } = await import('./zxWaitForAudioEventEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import SpriteEntity from '../spriteEntity.js';
import SpriteTool from '../../../spriteTool.js';
import ButtonEntity from '../buttonEntity.js';
import ZXWaitForAudioEventEntity from './zxWaitForAudioEventEntity.js';
import Tool from '../../../tool.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * ZX Spectrum themed dialog entity for adjusting the audio volume of a given
 * channel. It renders a slider with buttons, persists the volume to a cookie,
 * can play a sample sound and reports the active audio driver state.
 */
export class ZXVolumeEntity extends AbstractEntity {

  /**
   * Creates the volume dialog entity for a specific audio channel.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} channel - The audio channel identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   */
  constructor(parentEntity, x, y, width, height, channel, cookie, sampleSound) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXVolumeEntity';

    this.channel = channel;
    this.cookie = cookie;
    this.sampleSound = sampleSound;
    this.cursorEntity = null;
    this.driverEntity = null;
  } // constructor

  /**
   * Builds the dialog layout: title, preset and step buttons, the volume slider
   * with its cursor, the play-sample and close buttons and the driver status line.
   */
  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, ZXColor.black));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, this.channel, ZXColor.brightWhite, false, {align: 'center', topMargin: 2}));
    this.addEntity(new AbstractEntity(this, 1, 9, this.width-2, this.height-10, false, ZXColor.yellow));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 22, this.width, 9, 'CHANGE VOLUME FOR GAME '+this.channel, ZXColor.black, false, {align: 'center'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 3, 36, 19, 13, 'OFF', {id: 'setVolume0'}, [], ZXColor.brightWhite, ZXColor.green, {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 91, 36, 19, 13, '50%', {id: 'setVolume5'}, [], ZXColor.brightWhite, ZXColor.green, {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 178, 36, 21, 13, 'MAX', {id: 'setVolume10'}, [], ZXColor.brightWhite, ZXColor.green, {topMargin: 4, leftMargin: 2}));

    var sliderEntity = new SpriteEntity(this, 10, 55, ZXColor.black, false, 0, 0);
    sliderEntity.setGraphicsData(SpriteTool.decode('lP10510070600012H020H530121232123414141414141414141454141414141414141414321232121'));
    this.addEntity(sliderEntity);

    this.cursorEntity = new SpriteEntity(this, 8+this.app.audioManager.volume[this.channel]*18, 51, ZXColor.brightRed, false, 0, 0);
    this.cursorEntity.setGraphicsData(SpriteTool.decode('lP100500F05000501031D012332423321'));
    this.addEntity(this.cursorEntity);


    for(var x = 0; x <= 10; x++) {
      this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 3+x*18, 52, 16, 13, '', {id: 'setVolume'+x}, [], false, false, {}));
    }

    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, 3, 68, 19, 13, '-', {id: 'changeVolumeDown'}, ['ArrowLeft', '-', 'GamepadLeft'], ZXColor.brightWhite, ZXColor.blue, {align: 'center', topMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, 178, 68, 21, 13, '+', {id: 'changeVolumeUp'}, ['ArrowRight', '+', 'GamepadRight'], ZXColor.brightWhite, ZXColor.blue, {align: 'center', topMargin: 2}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 67, 90, 67, 13, 'PLAY SAMPLE', {id: 'playSample'}, ['Enter', 'GamepadOK'], ZXColor.brightWhite, ZXColor.magenta, {margin: 4}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', {id: 'closeVolume'}, ['Escape', 'GamepadExit'], ZXColor.brightWhite, ZXColor.blue, {align: 'center', margin: 4}));

    this.driverEntity = new TextEntity(this, this.app.fonts.fonts5x5, 3, this.height-8, this.width-6, 5, '', ZXColor.brightRed, false, {});
    this.addEntity(this.driverEntity);
  } // init

  /**
   * Sets the channel volume, clamping it to the range 0-10, persists it to the
   * cookie and repositions the slider cursor.
   * @param {number} volume - The requested volume level (clamped to 0-10).
   */
  changeVolume(volume) {
    this.app.audioManager.volume[this.channel] = Math.min(10, Math.max(0, Math.round(volume)));
    Tool.writeCookie(this.cookie, this.app.audioManager.volume[this.channel]);
    this.cursorEntity.x = 8+this.app.audioManager.volume[this.channel]*18;
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
        this.changeVolume(this.app.audioManager.volume[this.channel]+1);
        return true;
      case 'changeVolumeDown':
        this.changeVolume(this.app.audioManager.volume[this.channel]-1);
        return true;
      case 'playSample':
        if (this.app.inputEventsManager.needEventForAudio()) {
          this.addModalEntity(new ZXWaitForAudioEventEntity(this, 36, 68, 127, 45, ZXColor.brightWhite, ZXColor.magenta, 'playSample2'));
          return true;
        }
      case 'playSample2':
        this.sendEvent(0, 0, {id: 'openAudioChannel', channel: this.channel, options: {audioSilentHandler: 'silent'}});
        if (this.app.audioManager.volume[this.channel] == 0.0) {
          this.driverEntity.setText('NOTE: AUDIO DRIVER IS OFF');
        } else {
          switch (this.app.audioManager.channels[this.channel].id) {
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
        this.sendEvent(0, 0, {id: 'playSound', sound: this.sampleSound, channel: this.channel, options: false});
        return true;
      case 'errorAudioChannel':
        this.driverEntity.setText(event.error);
        this.app.showErrorMessage(event.error, 'reopen');
        return true;
      case 'closeVolume':
        this.sendEvent(0, 0, {id: 'closeAudioChannel', channel: this.channel});
        this.sendEvent(0, 0, {id: 'refreshMenu'});
        this.destroy();
        return true;
    }
    return false;
  } // handleEvent

} // ZXVolumeEntity

export default ZXVolumeEntity;
