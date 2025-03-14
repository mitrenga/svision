/**/
const { AbstractEntity } = await import('./abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from './abstractEntity.js';
/**/
// begin code

export class BorderEntity  extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'BorderEntity';
  } // constructor

} // class BorderEntity

export default BorderEntity;
