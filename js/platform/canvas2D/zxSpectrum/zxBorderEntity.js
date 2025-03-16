/**/
const { BorderEntity } = await import('../../../borderEntity.js?ver='+window.srcVersion);
/*/
import BorderEntity from '../../..  /borderEntity.js';
/**/
// begin code

export class ZXBorderEntity  extends BorderEntity {

  constructor() {
    super();
    this.id = 'zxBorderEntity';
  } // constructor

} // class ZXBorderEntity

export default ZXBorderEntity;
