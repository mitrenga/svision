/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

export class SpriteEntity  extends AbstractEntity {

  constructor(parentEntity, x, y, penColor, bkColor, frame, direction) {
    super(parentEntity, x, y, 0, 0, penColor, bkColor);
    this.id = 'SpriteEntity';

    this.framesCount = 0;
    this.directionsCount = 0;
    this.paintCorrectionX = 0;
    this.paintCorrectionY = 0;
    this.frame = frame;
    this.direction = direction;
    this.spriteData = null;
  } // constructor

  setGraphicsData(data) {
    this.framesCount = data['frames'];
    this.directionsCount = data['directions'];
    this.spriteData = [];
    var spriteWidth = 0;
    var spriteHeight = 0;
    for (var s = 0; s < data['sprite'].length; s++) {
      var frameCfg = data['sprite'][s];
      var spriteFrame = [];
      var spriteFrameWidth = 0;
      var spriteFrameHeight = 0;
      frameCfg.forEach((row, r) => {
        for (var col = 0; col < row.length; col++) {
          if (row[col] == data['pen']) {
            spriteFrame.push({'x': col, 'y': r});
            if (col+1 > spriteFrameWidth) {
              spriteFrameWidth = col+1;
            }
          }
        }
        spriteFrameHeight++;
      });
      this.spriteData[s] = spriteFrame;
      if (spriteFrameWidth > spriteWidth) {
        spriteWidth = spriteFrameWidth;
      }
      if (spriteFrameHeight > spriteHeight) {
        spriteHeight = spriteFrameHeight;
      }
    }
    this.width = spriteWidth;
    this.height = spriteHeight;
    if ('paintCorrections' in data) {
      this.paintCorrectionX = data['paintCorrections']['x'];
      this.paintCorrectionY = data['paintCorrections']['y'];
    }
  } // setGraphicsData

  incFrame() {
    this.frame++;
    if (this.frame >= this.framesCount) {
      this.frame = 0;
    }
  } // incFrame

  decFrame() {
    this.frame--;
    if (this.frame < 0) {
      this.frame = this.framesCount-1;
    }
  } // decFrame

  switchDirection() {
    if (this.directionsCount == 2) {
      this.direction = Math.abs(this.direction-1);
    }
  } // switchDirection

  drawEntity() {
    super.drawEntity();
  
    if (this.spriteData !== null) {
      this.spriteData[this.frame+this.direction*this.framesCount].forEach((pixel) => {
        var color = this.penColor;
        if ('penColor' in pixel) {
          color = pixel['color'];
        }
        this.app.layout.paint(this, pixel['x']+this.paintCorrectionX, pixel['y']+this.paintCorrectionY, 1, 1, color);
      });  
    }
  } // drawEntity

} // class SpriteEntity

export default SpriteEntity;
