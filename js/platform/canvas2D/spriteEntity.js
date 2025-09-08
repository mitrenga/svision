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

    this.frames = 0;
    this.directions = 0;
    this.frame = frame;
    this.penChar = '#';
    this.direction = direction;
    this.spriteData = null;
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.repeatX = 1;
    this.repeatY = 1;
    this.fixWidth = 0;
    this.fixHeight = 0;
    this.colorsMap = false;
  } // constructor

  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  setFixSize(width, height) {
    this.fixWidth = width;
    this.fixHeight = height;
    this.width = width*this.repeatX;
    this.height = height*this.repeatY;
    this.spriteWidth = width;
    this.spriteHeight = height;
  }

  setRepeatX(value) {
    this.repeatX = value;
    this.width = this.spriteWidth*value;
  } // setRepeatX

  setRepeatY(value) {
    this.repeatY = value;
    this.height = this.spriteHeight*value;
  } // setRepeatY

  setPenColor(color) {
    this.penColor = color;
    this.colorsMap = false;
    this.cleanCache();
  }

  setColorsMap(colorsMap) {
    this.colorsMap = colorsMap;
    this.penColor = false;
    this.cleanCache();
  } // setColorsMap

  setGraphicsData(data) {
    if ('penChar' in data) {
      this.penChar = data.penChar;
    }
    if ('frames' in data) {
      this.frames = data.frames;
    }
    if ('directions' in data) {
      this.directions = data.directions;
    }
    this.spriteData = [];
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.drawCache = [];
    this.drawCacheRatio = [];
    this.drawCacheCtx = [];

    if (this.frames == 0) {
      this.spriteData[0] = this.setOneFrameData(data.sprite);
      this.frames = 1;
      this.directions = 1;
      this.app.layout.newDrawingCache(this, 0);
    } else {
      if (this.directions == 0) {
        this.directions = 1;
      }
      for (var s = 0; s < data.sprite.length; s++) {
        this.spriteData[s] = this.setOneFrameData(data.sprite[s]);
        this.app.layout.newDrawingCache(this, s);
      }
    }
    this.setDimensions();
  } // setGraphicsData

  setOneFrameData(frameData) {
    var spriteFrame = [];
    var spriteFrameWidth = 0;
    var spriteFrameHeight = 0;
    frameData.forEach((row, r) => {
      for (var col = 0; col < row.length; col++) {
        var isPixel = false;
        if (this.colorsMap == false && row[col] == this.penChar) {
          spriteFrame.push({'x': col, 'y': r});
          isPixel = true;
        }
        if (this.colorsMap != false) {
          if (row[col] in this.colorsMap) {
            spriteFrame.push({'x': col, 'y': r, 'c': row[col]});
            isPixel = true;
          }
        }
        if (isPixel) {
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

  setGraphicsDataFromHexStr(str) {
    var sprite = [];
    for (var x = 0; x < 8; x++) {
      sprite.push(this.app.hexToBin(str.substring(x*2, x*2+2)));
    }
    this.setGraphicsData({'penChar': '1', 'sprite': sprite});
  } // setGraphicsDataFromHexStr

  addGraphicsDataFromHexStr(str) {
    var sprite = [];
    for (var x = 0; x < 8; x++) {
      sprite.push(this.app.hexToBin(str.substring(x*2, x*2+2)));
    }
    if (this.directions == 0) {
      this.directions = 1;
    }
    this.penChar = '1';
    this.spriteData[this.frames] = this.setOneFrameData(sprite);
    this.app.layout.newDrawingCache(this, this.frames);
    this.frames++;
    this.setDimensions();
  } // addGraphicsDataFromHexStr

  setDimensions() {
    if (this.fixWidth > 0) {
      this.width = this.fixWidth*this.repeatX;
      this.spriteWidth = this.fixWidth;
    } else {
      this.width = this.spriteWidth*this.repeatX;
    }
    if (this.fixHeight > 0) {
      this.height = this.fixHeight*this.repeatY;
      this.spriteHeight = this.fixHeight;
    } else {
      this.height = this.spriteHeight*this.repeatY;
    }
  } // setDimensions

  cloneSprite(sprite) {
    this.spriteData[this.frames] = Array(this.spriteData[sprite].length);
    for (var s = 0; s < this.spriteData[sprite].length; s++) {
      this.spriteData[this.frames][s] = {...this.spriteData[sprite][s]};
    }
    this.app.layout.newDrawingCache(this, this.frames);
    this.frames++;
  } // cloneSprite

  rotateSpriteRow(index, row, shift) {
    this.spriteData[index].forEach((pixel, p) => {
      if (pixel.y == row) {
       this.spriteData[index][p].x += shift;
       if (this.spriteData[index][p].x < 0) {
        this.spriteData[index][p].x += this.spriteWidth;
       }
       if (this.spriteData[index][p].x >= this.spriteWidth) {
        this.spriteData[index][p].x -= this.spriteWidth;
       }
      }
    });
  } // rotateSpriteRow

  moveSpriteWithCrop(index, shiftX, shiftY, cropX, cropY) {
    for (var p = 0; p < this.spriteData[index].length; ) {
      var pixel = this.spriteData[index][p];
      pixel.x += shiftX;
      pixel.y += shiftY;
      if (pixel.x < 0 || pixel.y < 0 || pixel.x >= cropX || pixel.y >= cropY) {        
        this.spriteData[index].splice(p, 1);
      } else {
        p++;
      }
    }
  } // moveSpriteWithCrop

  incFrame() {
    this.frame = this.app.rotateInc(this.frame, 0, this.frames-1);
  } // incFrame

  decFrame() {
    this.frame = this.app.rotateDec(this.frame, 0, this.frames-1);
  } // decFrame

  switchDirection() {
    if (this.directions == 2) {
      this.direction = 1-this.direction;
    }
  } // switchDirection

  drawEntity() {
    if (this.spriteData !== null) {
      var d = this.direction;
      if (this.directions == 1) {
        d = 0;
      }
      var index = this.frame+d*this.frames;
      if (this.drawingCache[index].needToRefresh(this, this.width, this.height)) {
        if (this.bkColor != false) {
          this.app.layout.paintRect(this.drawingCache[index].ctx, 0, 0, this.width, this.height, this.bkColor);
        }
        this.spriteData[index].forEach((pixel) => {
          var color = this.penColor;
          if ('c' in pixel) {
            if (color == false) {
              color = this.colorsMap[pixel.c][index];
            } else {
              if (pixel.c != this.penChar) {
                color = false;
              }
            }
          } else {
            if (this.colorsMap !== false) {
              color = this.colorsMap[this.penChar][index];
            }
          }
          if (color !== false) {
            for (var x = 0; x < this.repeatX; x++) {
              for (var y = 0; y < this.repeatY; y++) {
                this.app.layout.paintRect(this.drawingCache[index].ctx, pixel.x+x*this.spriteWidth, pixel.y+y*this.spriteHeight, 1, 1, color);
              }
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

  cleanCache() {
    for (var d = 0; d < this.directions; d++) {
      for (var f = 0; f < this.frames; f++) {
        this.drawingCache[f+d*this.frames].cleanCache();
      }
    }
  } // cleanCache

} // class SpriteEntity

export default SpriteEntity;
