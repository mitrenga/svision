/**/
const { AbstractEntity } = await import('./abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from './abstractEntity.js';
/**/
// begin code

export class DesktopEntity  extends AbstractEntity {

  constructor() {
    super(null, 0, 0, 0, 0, false, false);
    this.id = 'DesktopEntity';
  } // constructor

} // class DesktopEntity

export default DesktopEntity;
