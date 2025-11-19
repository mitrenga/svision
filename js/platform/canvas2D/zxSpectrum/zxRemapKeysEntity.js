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

  constructor(parentEntity, x, y, width, height, keys) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXRemapKeysEntity';

    this.keys = keys;
    this.cursorEntity = null;
  } // constructor

  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, this.app.platform.colorByName('white')));

    for (var k = 0; k < this.keys.keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 30, 18+12*k, 74, 9, this.keys.keys[k].label, this.app.platform.colorByName('black'), false, {margin: 2}));
    }
    this.addEntity(this.cursorEntity = new TextEntity(this, this.app.fonts.fonts5x5, this.width-62, 18, 32, 9, '', this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('brightBlue'), {align: 'center', margin: 2}));


    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeZXRemapKeys', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('brightBlue'), {align: 'center', margin: 4}));
  } // init


  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) { 

      case 'closeZXRemapKeys':
        this.destroy();
        return true;

      case 'changeFlashState':
        if (this.app.stack.flashState) {
          this.cursorEntity.setText('█');
        } else {
          this.cursorEntity.setText('');
        }
        break;
        
      case 'keyPress':
        break;
    }

    return false;
  } // handleEvent

} // ZXRemapKeysEntity

export default ZXRemapKeysEntity;
