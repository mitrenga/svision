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

  constructor(parentEntity, x, y, width, height, keysMap) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXRemapKeysEntity';

    this.keysMap = keysMap;
    this.newKeys = [];
    this.position = 0;
    this.validFnKeys = {
      keyboard: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Clear', 'Shift', 'Control', 'Meta', 'Alt'],
      mouse: ['Mouse1', 'Mouse2', 'Mouse4', 'Mouse8', 'Mouse16', 'Mouse32', 'Mouse64', 'Mouse128']
    };
  } // constructor

  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, this.app.platform.colorByName('white')));

    for (var k = 0; k < this.keysMap.keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 30, 18+12*k, 74, 9, this.keysMap.keys[k].label, this.app.platform.colorByName('black'), false, {margin: 2}));
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.width-62, 18+12*k, 32, 9, this.cursorText(), false, false, {align: 'center', margin: 2, hide: true, member: this.keysMap.keys[k].action}));
    }
    this.sendEvent(1, 0, {id: 'updateEntity', member: this.keysMap.keys[0].action, penColor: this.app.platform.colorByName('brightWhite'), bkColor: this.app.platform.colorByName('brightBlue'), text: this.cursorText(), hide: false});

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeZXRemapKeys', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('brightBlue'), {align: 'center', margin: 4}));
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
        this.sendEvent(1, 0, {id: 'updateEntity', member: this.keysMap.keys[this.position].action, text: this.cursorText()});
        break;

      case 'keyPress':
        var newKey = false;
        if (event.key.length == 1) {
          if (event.key.toUpperCase() in this.app.fonts.fonts5x5.fontsData) {
            newKey = event.key.toUpperCase();
          }
        } else if (this.validFnKeys[this.keysMap.device].indexOf(event.key) >= 0) {
          newKey = event.key;
        }
        if (newKey !== false && this.newKeys.find((key) => key.key == newKey) === undefined) {
          this.newKeys.push({action: this.keysMap.keys[this.position].action, key: newKey});
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.keysMap.keys[this.position].action, penColor: this.app.platform.colorByName('brightBlue'), bkColor: false, text: this.parentEntity.prettyKey(newKey)});
          this.position++;
          if (this.position == this.keysMap.keys.length) {
            this.newKeys.forEach((newKey) => {
              this.sendEvent(-1, 0, {id: 'updateEntity', member: this.keysMap.device+'.'+newKey.action, text: this.parentEntity.prettyKey(newKey.key)});
              this.app.controls[this.keysMap.device][newKey.action] = newKey.key;
            });
            this.destroy();
            return true;
          }
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.keysMap.keys[this.position].action, penColor: this.app.platform.colorByName('brightWhite'), bkColor: this.app.platform.colorByName('brightBlue'), text: this.cursorText(), hide: false});
        }
        break;
    }

    return false;
  } // handleEvent

} // ZXRemapKeysEntity

export default ZXRemapKeysEntity;
