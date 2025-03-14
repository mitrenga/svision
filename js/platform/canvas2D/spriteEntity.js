/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

export class SpriteEntity  extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, spriteData, penColor, bkColor) {
    super(parentEntity, x, y, width, height, penColor, false);
    this.id = 'SpriteEntity';

    this.spriteData = spriteData;
    this.bkSpriteColor = bkColor;
  } // constructor

  drawEntity() {
    super.drawEntity();
  
    if (this.bkSpriteColor !== false) {
      this.app.layout.paint(0, 0, this.width, this.height, this.bkSpriteColor);
    }

    this.spriteData.forEach((pixel) => {
      var color = this.penColor;
      if ('penColor' in pixel) {
        color = pixel['color'];
      }
      this.app.layout.paint(this, pixel['x'], pixel['y'], 1, 1, color);
    });  
  } // drawEntity

} // class SpriteEntity

export default SpriteEntity;
