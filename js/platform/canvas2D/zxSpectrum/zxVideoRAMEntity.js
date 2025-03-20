/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
/**/
// begin code

export class ZXVideoRAMEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height);
    this.id = 'ZXVideoRAMEntity';
    this.penColor = false;
    this.bkColor = false;
    this.resultTime = false;
  } // constructor

  getVideoRAMValue(addr) {
    return false;
  } // getVideoRAMValue

  drawEntity() {
    var startTime = Date.now();
    super.drawEntity();
    for (var row = 0; row < 192; row++) {
      for (var column = 0; column < 32; column++) {
        var hexData = this.getVideoRAMValue(row*32+column);
        if (hexData !== false) {
          var binData = this.app.hexToBin(hexData);
          var hexAttribut = this.getVideoRAMValue(6144+(row%8)*32+Math.floor(row/64)*256+column);
          if (hexAttribut === false) {
            hexAttribut = '38';
          }
          var intAttribut = this.app.hexToInt(hexAttribut);
          for (var bit = 0; bit < 8; bit++) {
            if (binData[bit] == '1') {
              this.app.layout.paint(this, column*8+bit, (row%8)*8+Math.floor(row%64/8)+Math.floor(row/64)*64, 1, 1, this.app.platform.penColorByAttribut(intAttribut));
            } else {
              this.app.layout.paint(this, column*8+bit, (row%8)*8+Math.floor(row%64/8)+Math.floor(row/64)*64, 1, 1, this.app.platform.bkColorByAttribut(intAttribut));
            }
          }
        }
      }
    }
    var stopTime = Date.now();
    if (this.resultTime === false) 
      this.resultTime = stopTime-startTime;
  } // drawEntity

} // class ZXVideoRAMEntity

export default ZXVideoRAMEntity;
