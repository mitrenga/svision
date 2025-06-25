/**/
const { ZXTextEntity } = await import('./zxTextEntity.js?ver='+window.srcVersion);
/*/
import ZXTextEntity from './zxTextEntity.js';
/**/
// begin code

export class ZXButtonEntity extends ZXTextEntity {

  constructor(parentEntity, x, y, width, height, text, eventID, hotKeys, penColor, bkColor, fontType, proportional) {
    super(parentEntity, x, y, width, height, text, penColor, bkColor, fontType, proportional);
    this.id = 'ButtonEntity';

    this.eventID = eventID;
    this.hotKeys = hotKeys;
  } // constructor

  handleEvent(event) {
    var result = super.handleEvent(event);
    if (result == true) {
      return true;
    }

    switch (event.id) {
      case 'keyPress':
        if (this.hotKeys.indexOf(event.key) >= 0) {
          this.sendEvent(-1, 0, {'id': this.eventID});
          return true;
        }
        break;
      case 'mouseClick':
        if ((event.key == 'left') && (this.pointOnEntity(event))) {
          this.sendEvent(-1, 0, {'id': this.eventID});
          return true;
        }
        break;
    }
    return false;
  } // handleEvent

} // class ZXButtonEntity

export default ZXButtonEntity;
