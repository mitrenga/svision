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
    
    this.drawCache = [];
    this.drawCacheRatio = [];
    this.drawCacheCtx = [];
  } // constructor

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
      this.drawCache[0] = null;
      this.drawCacheRatio[0] = 0;
      this.drawCacheCtx[0] = false;
    } else {
      for (var s = 0; s < data.sprite.length; s++) {
        this.spriteData[s] = this.setOneFrameData(data.sprite[s]);
        this.drawCache[s] = null;
        this.drawCacheRatio[s] = 0;
        this.drawCacheCtx[s] = false;
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
      if (this.drawCache[index] == null) {
        this.drawCache[index] = document.createElement('canvas');
        this.drawCacheCtx[index] = this.drawCache[index].getContext('2d');
      }
      if (this.drawCacheRatio[index] != this.app.layout.ratio) {
        this.drawCacheRatio[index] = this.app.layout.ratio;
        this.drawCache[index].width = this.width*this.drawCacheRatio[index];
        this.drawCache[index].height = this.height*this.drawCacheRatio[index];
        this.drawCacheCtx[index].clearRect(0, 0, this.width*this.drawCacheRatio[index], this.height*this.drawCacheRatio[index]);

        this.spriteData[index].forEach((pixel) => {
          var color = this.penColor;
          if ('penColor' in pixel) {
            color = pixel.color;
          }
          this.drawCacheCtx[index].fillStyle = color;
          this.drawCacheCtx[index].fillRect(pixel.x*this.drawCacheRatio[index], pixel.y*this.drawCacheRatio[index], this.drawCacheRatio[index], this.drawCacheRatio[index]);
        });  
      }
      this.app.stack['ctx'].drawImage(this.drawCache[index], (this.parentX+this.x)*this.drawCacheRatio[index], (this.parentY+this.y)*this.drawCacheRatio[index]);
    }
  } // drawEntity

} // class SpriteEntity

export default SpriteEntity;
