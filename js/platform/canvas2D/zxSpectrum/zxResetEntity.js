/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
/**/
// begin code

export class ZXResetEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXResetEntity';

    this.timeTrace = 0;
    this.resetTime = 300;
    this.defaultState = [[0, 0, 0], [0, 0, 8], [0, 8, 8], [8, 8, 8], [0, 8, 8], [0, 0, 8]];
    this.calculatedSector = [2, 1, 0, 0, 1, 2];
  } // constructor

  drawEntity() {
    this.app.layout.paint(this, 0, 0, this.width, this.height, this.app.platform.colorByName('black'));
    var penColor = this.app.platform.colorByName('red');
    if (this.timeTrace < this.resetTime) {
      var phase = Math.floor(this.timeTrace/this.resetTime*6);
      var redLine = [];
      redLine = redLine.concat(this.defaultState[phase]);
      redLine[this.calculatedSector[phase]] = Math.abs(this.defaultState[phase][this.calculatedSector[phase]]-Math.floor((this.timeTrace%(this.resetTime/6))/(this.resetTime/6)*8));
      for (var sector = 0; sector < 3; sector++) {
        for (var row = 1; row < 9; row++) {
          for (var column = 0; column < 32; column++) {
            this.app.layout.paint(this, column*8+6, (sector*8+row)*8-redLine[sector], 1, redLine[sector], penColor);
          }
        }
      }
    }
  } // drawEntity

  loopEntity(timestamp) {
    if (this.model.timer != false) {
      this.timeTrace = Math.round(timestamp-this.model.timer);
    }
  } // loopEntity

} // ZXResetEntity

export default ZXResetEntity;
