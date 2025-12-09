/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import ButtonEntity from '../buttonEntity.js';
/**/
// begin code

export class ZXErrorEntity extends AbstractEntity {

  constructor(parentEntity, x, y, fonts, message, action, penColor, bkColor) {
    super(parentEntity, x, y+(192-15*8)/2, 256, 15*8, penColor, bkColor);

    this.id = 'ZXErrorEntity';
    this.fonts = fonts;
    this.message = message;
    this.action = action;
  } // constructor

  init() {
    super.init();

    this.addEntity(new TextEntity(this, this.fonts, 0, 0, 256, 8, 'PANIC IN GAME!', this.penColor, false, {align: 'center'}));
    switch (this.action) {
      case 'restart':
        this.addEntity(new TextEntity(this, this.fonts, 16, 12, 28*8, 4*8, 'We are very sorry, but an error has occurred that we cannot resolve at this time. You need to restart the game.', this.penColor, false, {align: 'center', textWrap: true}));
        this.addEntity(new ButtonEntity(this, this.fonts, 16, 96, 80, 12, 'RESTART', {id: 'restartAfterError'}, [], this.bkColor, this.penColor, {align: 'center', margin: 2}));
        this.addEntity(new ButtonEntity(this, this.fonts, 162, 96, 80, 12, 'IGNORE', {id: 'ignoreAfterError'}, [], this.bkColor, this.penColor, {align: 'center', margin: 2}));
        break;
      case 'reopen':
        this.addEntity(new TextEntity(this, this.fonts, 16, 12, 28*8, 5*8, 'We are very sorry, but an error has occurred that we cannot resolve at this time. You can try close and open '+window.appName+' game again.', this.penColor, false, {align: 'center', textWrap: true}));
        this.addEntity(new ButtonEntity(this, this.fonts, 88, 96, 80, 12, 'CONTINUE', {id: 'ignoreAfterError'}, [], this.bkColor, this.penColor, {align: 'center', margin: 2}));
        break;
    }
    this.addEntity(new TextEntity(this, this.fonts, 16, 52, 28*8, 4*8, 'ERROR: '+this.message, this.penColor, false, {align: 'center', textWrap: true}));
  } // init

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'restartAfterError':
        location.reload();
        return true;
      case 'ignoreAfterError':
        this.destroy();
        return true;
    }
    
    return false;
  } // handleEvent

} // ZXErrorEntity

export default ZXErrorEntity;
