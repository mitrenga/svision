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
    this.frame = frame;
    this.penChar = '#';
    this.direction = direction;
    this.spriteData = null;
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.repeatX = 1;
    this.repeatY = 1;
  } // constructor

  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  setGraphicsData(data) {
    if ('pen' in data) {
      this.penChar = data.pen;
    }
    if ('frames' in data) {
      this.framesCount = data.frames;
    }
    if ('directions' in data) {
      this.directionsCount = data.directions;
    }
    this.spriteData = [];
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.drawCache = [];
    this.drawCacheRatio = [];
    this.drawCacheCtx = [];

    if (this.framesCount == 0) {
      this.spriteData[0] = this.setOneFrameData(data.sprite);
      this.framesCount = 1;
      this.directionsCount = 1;
      this.app.layout.newDrawingCache(this, 0);
    } else {
      if (this.directionsCount == 0) {
        this.directionsCount = 1;
      }
      for (var s = 0; s < data.sprite.length; s++) {
        this.spriteData[s] = this.setOneFrameData(data.sprite[s]);
        this.app.layout.newDrawingCache(this, s);
      }
    }
    this.width = this.spriteWidth;
    this.height = this.spriteHeight;
  } // setGraphicsData

  setOneFrameData(frameData) {
    var spriteFrame = [];
    var spriteFrameWidth = 0;
    var spriteFrameHeight = 0;
    frameData.forEach((row, r) => {
      for (var col = 0; col < row.length; col++) {
        if (row[col] == this.penChar) {
          spriteFrame.push({'x': col, 'y': r});
          if (col+1 > spriteFrameWidth) {
            spriteFrameWidth = col+1;
          }
        } else {
          if (this.bkColor !== false) {
            if (col+1 > spriteFrameWidth) {
              spriteFrameWidth = col+1;
            }
          }
        }
      }
      spriteFrameHeight++;
    });
    if (spriteFrameWidth > this.spriteWidth) {
      this.spriteWidth = spriteFrameWidth;
    }
    if (spriteFrameHeight > this.spriteHeight) {
      this.spriteHeight = spriteFrameHeight;
    }
    return spriteFrame;
  } // setOneFrameData

  setGraphicsDataFromHexStr(kind, str) {
    var sprite = [];
    for (var x = 0; x < 8; x++) {
      sprite.push(this.app.hexToBin(str.substring(x*2, x*2+2)));
    }
    this.setGraphicsData({'kind': kind, 'pen': '1', 'sprite': sprite});
  } // setGraphicsDataFromHexStr

  incFrame() {
    this.frame = this.app.rotateInc(this.frame, 0, this.framesCount-1);
  } // incFrame

  decFrame() {
    this.frame = this.app.rotateDec(this.frame, 0, this.framesCount-1);
  } // decFrame

  switchDirection() {
    if (this.directionsCount == 2) {
      this.direction = 1-this.direction;
    }
  } // switchDirection

  drawEntity() {
    if (this.spriteData !== null) {
      var index = this.frame+this.direction*this.framesCount;
      if (this.drawingCache[index].needToRefresh(this, this.width*this.repeatX, this.height*this.repeatY)) {
        if (this.bkColor != false) {
          this.app.layout.paintRect(this.drawingCache[0].ctx, 0, 0, this.width*this.repeatX, this.height*this.repeatY, this.bkColor);
        }
        this.spriteData[index].forEach((pixel) => {
          var color = this.penColor;
          if ('penColor' in pixel) {
            color = pixel.color;
          }
          for (var x = 0; x < this.repeatX; x++) {
            for (var y = 0; y < this.repeatY; y++) {
              this.app.layout.paintRect(this.drawingCache[index].ctx, pixel.x+x*this.width, pixel.y+y*this.height, 1, 1, color);
            }
          }
        });  
      }
      
      if (this.drawingCropCache == null) {
        this.app.layout.paintCache(this, index);
      } else {
        if ((this.x >= 0) && (this.y >= 0) && (this.x+this.width-1 <= this.parentWidth) && (this.y+this.height-1 <= this.parentHeight)) {
          this.app.layout.paintCache(this, index);
        } else {
          var posX = 0;
          if (this.x < 0) {
            posX = this.x;
          }
          if (this.x+this.width-1 > this.parentWidth) {
            posX = this.x+this.width-this.parentWidth;
          }
          var posY = 0;
          if (this.y < 0) {
            posY = this.y;
          }
          if (this.y+this.height-1 > this.parentHeight) {
            posY = this.y+this.height-this.parentHeight;
          }
          this.app.layout.paintCropCache(this, 0, -posX, -posY, -posX, -posY);
        }
      }
    }
  } // drawEntity

} // class SpriteEntity

export default SpriteEntity;
