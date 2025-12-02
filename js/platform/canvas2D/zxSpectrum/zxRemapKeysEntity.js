/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import ButtonEntity from '../buttonEntity.js';
import TextEntity from '../textEntity.js';
/**/
// begin code

export class ZXRemapKeysEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, options) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXRemapKeysEntity';

    this.options = options;
    this.newKeys = [];
    this.position = 0;
    this.validFnKeys = {
      keyboard: ['NoKey', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Clear', 'Shift', 'Control', 'Meta', 'Alt'],
      mouse: ['NoKey', 'Mouse1', 'Mouse2', 'Mouse4', 'Mouse8', 'Mouse16', 'Mouse32', 'Mouse64', 'Mouse128'],
      gamepads: ['NoKey']
    };
  } // constructor

  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, this.app.platform.colorByName('white')));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, 'REMAP '+this.options.device.toUpperCase()+' KEYS', this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center', margin: 2}));

    for (var k = 0; k < this.options.keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 11, 18+12*k, 74, 9, this.options.keys[k].label, this.app.platform.colorByName('black'), false, {margin: 2}));
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.width-83, 18+12*k, 32, 9, this.cursorText(), false, false, {align: 'center', margin: 2, hide: true, member: this.options.keys[k].action}));
    }
    this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[0].action, penColor: this.app.platform.colorByName('brightWhite'), bkColor: this.app.platform.colorByName('brightBlue'), text: this.cursorText(), hide: false});
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-44, 18, 32, 9, 'SKIP', 'skipKey', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('red'), {align: 'center', margin: 2, member: 'skipKey'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeZXRemapKeys', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('blue'), {align: 'center', margin: 4}));
  } // init

  cursorText() {
    var cursor = '';
    if (this.app.stack.flashState) {
      cursor = '█';
    }
    return cursor;
  } // cursorText

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) { 

      case 'closeZXRemapKeys':
        this.destroy();
        return true;

      case 'changeFlashState':
        if (this.position < this.options.keys.length) {
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, text: this.cursorText()});
        }
        break;

      case 'skipKey':
        event.key = 'NoKey';
      case 'keyPress':
        var newKey = false;
        if (event.key.length == 1) {
          if (this.options.device == 'keyboard' && event.key.toUpperCase() in this.app.fonts.fonts5x5.fontsData) {
            newKey = event.key.toUpperCase();
          }
        } else if (this.validFnKeys[this.options.device].indexOf(event.key) >= 0) {
          newKey = event.key;
        }
        if ((newKey !== false && this.newKeys.find((key) => key.key == newKey) === undefined) || newKey == 'NoKey') {
          this.newKeys.push({action: this.options.keys[this.position].action, key: newKey});
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: this.app.platform.colorByName('brightBlue'), bkColor: false, text: this.app.prettyKey(newKey)});
          this.position++;
          if (this.position == this.options.keys.length) {
            this.newKeys.forEach((newKey) => {
              this.sendEvent(-1, 0, {id: 'updateEntity', member: this.options.device+'.'+newKey.action, text: this.app.prettyKey(newKey.key)});
              this.app.controls[this.options.device][newKey.action] = newKey.key;
            });
            this.app.setCookie(this.options.device, JSON.stringify(this.app.controls[this.options.device]));
            this.destroy();
            return true;
          }
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: this.app.platform.colorByName('brightWhite'), bkColor: this.app.platform.colorByName('brightBlue'), text: this.cursorText(), hide: false});
          this.sendEvent(1, 0, {id: 'updateEntity', member: 'skipKey', y: 18+12*this.position});
        }
        break;
    }

    return false;
  } // handleEvent

} // ZXRemapKeysEntity

export default ZXRemapKeysEntity;
