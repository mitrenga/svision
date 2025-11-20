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
    this.keysEntities = [];
    this.pos = 0;
    this.validFnKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Clear', 'Shift', 'Control', 'Meta', 'Alt'];
  } // constructor

  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, this.app.platform.colorByName('white')));

    for (var k = 0; k < this.keysMap.keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 30, 18+12*k, 74, 9, this.keysMap.keys[k].label, this.app.platform.colorByName('black'), false, {margin: 2}));
      var keyEntity = new TextEntity(this, this.app.fonts.fonts5x5, this.width-62, 18+12*k, 32, 9, this.cursorText(), false, false, {align: 'center', margin: 2, hide: true});
      this.addEntity(keyEntity);
      this.keysEntities.push(keyEntity);
    }
    this.keysEntities[0].setPenColor(this.app.platform.colorByName('brightWhite'));
    this.keysEntities[0].setBkColor(this.app.platform.colorByName('brightBlue'));
    this.keysEntities[0].hide = false;

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
        this.keysEntities[this.pos].setText(this.cursorText());
        break;
        
      case 'keyPress':
        var newKey = false;
        if (event.key.length == 1) {
          if (event.key.toUpperCase() in this.app.fonts.fonts5x5.fontsData) {
            newKey = event.key.toUpperCase();
          }
        } else if (this.validFnKeys.indexOf(event.key) >= 0) {
          newKey = event.key;
        }
        if (newKey !== false && this.newKeys.find((key) => key.key == newKey) === undefined) {
          this.newKeys.push({variable: this.keysMap.keys[this.pos].variable, key: newKey});
          this.keysEntities[this.pos].setPenColor(this.app.platform.colorByName('brightBlue'));
          this.keysEntities[this.pos].setBkColor(false);
          this.keysEntities[this.pos].setText(this.parentEntity.prettyKey(newKey));
          this.pos++;
          if (this.pos == this.keysMap.keys.length) {
            this.newKeys.forEach((newKey) => {
              this.app.controls[this.keysMap.device][newKey.variable] = newKey.key;
            });
            this.destroy();
            return true;
          }
          this.keysEntities[this.pos].setPenColor(this.app.platform.colorByName('brightWhite'));
          this.keysEntities[this.pos].setBkColor(this.app.platform.colorByName('brightBlue'));
          this.keysEntities[this.pos].hide = false;
        }
        break;
    }

    return false;
  } // handleEvent

} // ZXRemapKeysEntity

export default ZXRemapKeysEntity;
