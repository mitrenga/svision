/**/
const { MiniTextEntity } = await import('./miniTextEntity.js?ver='+window.srcVersion);
/*/
import MiniTextEntity from './miniTextEntity.js';
/**/
// begin code

export class MiniButtonEntity extends MiniTextEntity {

  constructor(parentEntity, x, y, width, height, text, eventID, hotKeys, penColor, bkColor, scale, margin) {
    super(parentEntity, x, y, width, height, text, penColor, bkColor, scale, margin);
    this.id = 'MiniButtonEntity';

    this.eventID = eventID;
    this.hotKeys = hotKeys;
  } // constructor

  handleEvent(event) {
    var result = super.handleEvent(event);
    if (result == true) {
      return true;
    }

    switch (event['id']) {
      case 'keyPress':
        if (this.hotKeys.indexOf(event['key']) >= 0) {
          this.sendEvent(-1, 0, {'id': this.eventID});
          return true;
        }
        break;
      case 'mouseClick':
        if ((event['key'] == 'left') && (this.pointOnEntity(event))) {
          this.sendEvent(-1, 0, {'id': this.eventID});
          return true;
        }
        break;
    }
    return false;
  } // handleEvent

} // class MiniButtonEntity

export default MiniButtonEntity;
