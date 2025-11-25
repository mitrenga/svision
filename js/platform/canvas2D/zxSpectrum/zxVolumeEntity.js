/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import SpriteEntity from '../spriteEntity.js';
import ButtonEntity from '../buttonEntity.js';
/**/
// begin code

export class ZXVolumeEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, channel, cookie, sampleSound) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXVolumeEntity';

    this.channel = channel;
    this.cookie = cookie;
    this.sampleSound = sampleSound;
    this.cursorEntity = null;
    this.driverEntity = null;
  } // constructor

  init() {
    super.init();
    
    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, this.channel.toUpperCase(), this.app.platform.colorByName('brightWhite'), false, {align: 'center', topMargin: 2}));
    this.addEntity(new AbstractEntity(this, 1, 9, this.width-2, this.height-10, false, this.app.platform.colorByName('yellow')));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 22, this.width, 9, 'CHANGE VOLUME FOR GAME '+this.channel.toUpperCase(), this.app.platform.colorByName('black'), false, {align: 'center'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 3, 36, 19, 13, 'OFF', 'setVolume0', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('green'), {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 91, 36, 19, 13, '50%', 'setVolume5', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('green'), {topMargin: 4, leftMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 178, 36, 21, 13, 'MAX', 'setVolume10', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('green'), {topMargin: 4, leftMargin: 2}));

    var sliderEntity = new SpriteEntity(this, 10, 55, this.app.platform.colorByName('black'), false, 0, 0);
    sliderEntity.setCompressedGraphicsData(
      'lP10510070600012H020H530121232123414141414141414141454141414141414141414321232121',
      false,
    );
    this.addEntity(sliderEntity);

    this.cursorEntity = new SpriteEntity(this, 8+this.app.audioManager.volume[this.channel]*18, 51, this.app.platform.colorByName('brightRed'), false, 0, 0);
    this.cursorEntity.setCompressedGraphicsData(
      'lP100500F05000501031D012332423321',
      false
    );
    this.addEntity(this.cursorEntity);


    for(var x = 0; x <= 10; x++) {
      this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 3+x*18, 52, 16, 13, '', 'setVolume'+x, [], false, false, {}));
    }

    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, 3, 68, 19, 13, '-', 'changeVolumeDown', ['ArrowLeft', '-'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('blue'), {align: 'center', topMargin: 2}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.zxFonts8x8, 178, 68, 21, 13, '+', 'changeVolumeUp', ['ArrowRight', '+'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('blue'), {align: 'center', topMargin: 2}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 67, 90, 67, 13, 'PLAY SAMPLE', 'playSample', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {margin: 4}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeVolume', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('blue'), {align: 'center', margin: 4}));

    this.driverEntity = new TextEntity(this, this.app.fonts.fonts5x5, 3, this.height-8, this.width-6, 5, '', this.app.platform.colorByName('brightRed'), false, {});
    this.addEntity(this.driverEntity);
  } // init

  changeVolume(volume) {
    this.app.audioManager.volume[this.channel] = Math.min(10, Math.max(0, Math.round(volume)));
    this.app.setCookie(this.cookie, this.app.audioManager.volume[this.channel]);
    this.cursorEntity.x = 8+this.app.audioManager.volume[this.channel]*18;
  } // changeVolume

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
        this.sendEvent(0, 0, {id: 'openAudioChannel', channel: this.channel, options: {audioDisableHandler: 'disable'}});
        if (this.app.audioManager.volume[this.channel] == 0.0) {
          this.driverEntity.setText('NOTE: AUDIO DRIVER IS OFF');
        } else {
          if (this.app.audioManager.channels[this.channel].id == 'AudioWorkletHandler') {
            this.driverEntity.setText('');
          } else {
            this.driverEntity.setText('WARNING: DRIVER IS DEPRECATED!');
          }
        }
        this.sendEvent(0, 0, {id: 'playSound', sound: this.sampleSound, channel: this.channel, options: false});
        return true;
      case 'errorAudioChannel':
        this.driverEntity.setText(event.error.toUpperCase());
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
