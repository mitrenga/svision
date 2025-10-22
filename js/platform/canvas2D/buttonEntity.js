/**/
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import TextEntity from './textEntity.js';
/**/
// begin code

export class ButtonEntity extends TextEntity {

  constructor(parentEntity, fonts, x, y, width, height, text, eventID, hotKeys, penColor, bkColor, options) {
    super(parentEntity, fonts, x, y, width, height, text, penColor, bkColor, options);
    this.id = 'ButtonEntity';

    this.eventID = eventID;
    this.hotKeys = hotKeys;
  } // constructor

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'keyPress':
        if (!this.hide && this.hotKeys.indexOf(event.key) >= 0) {
          this.sendEvent(-1, 0, {id: this.eventID});
          return true;
        }
        break;
      case 'mouseClick':
        if (!this.hide && (event.key == 'left') && (this.pointOnEntity(event))) {
          this.sendEvent(-1, 0, {id: this.eventID});
          return true;
        }
        break;
    }
    
    return false;
  } // handleEvent

} // ButtonEntity

export default ButtonEntity;
