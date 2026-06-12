/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * Entity that renders the ZX Spectrum power-on/reset screen animation,
 * drawing the characteristic moving red border lines over a black background
 * while the reset timer runs.
 */
export class ZXResetEntity extends AbstractEntity {

  /**
   * Creates the reset animation entity and initialises its animation state.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   */
  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXResetEntity';

    this.timeTrace = 0;
    this.resetTime = 300;
    this.defaultState = [[0, 0, 0], [0, 0, 8], [0, 8, 8], [8, 8, 8], [0, 8, 8], [0, 0, 8]];
    this.calculatedSector = [2, 1, 0, 0, 1, 2];
  } // constructor

  /**
   * Paints the black background and, while the reset timer is active, draws the
   * animated red border lines whose lengths are derived from the elapsed time.
   */
  drawEntity() {
    this.app.layout.paint(this, 0, 0, this.width, this.height, ZXColor.black);
    var penColor = ZXColor.red;
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

  /**
   * Per-frame update that recomputes the elapsed reset time from the model timer.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    if (this.model.timer != false) {
      this.timeTrace = Math.round(timestamp-this.model.timer);
    }
  } // loopEntity

} // ZXResetEntity

export default ZXResetEntity;
