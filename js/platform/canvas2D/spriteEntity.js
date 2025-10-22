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
          spriteFrame.push({x: col, y: r});
          isPixel = true;
        }
        if (this.colorsMap != false) {
          if (row[col] in this.colorsMap) {
            spriteFrame.push({x: col, y: r, c: row[col]});
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
    this.setGraphicsData({penChar: '1', sprite: sprite});
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

  hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  latinToInt(latinNum) {
    return parseInt(latinNum, 36);
  } // latinToInt

  intToHex(intNum, length) {
    return intNum.toString(16).padStart(length, '0').toUpperCase();
  } // intToHex

  intToLatin(intNum, length) {
    return intNum.toString(36).padStart(length, '0').toUpperCase();
  } // intToLatin

  setCompressedGraphicsData(data, logAfterDecompress) {
    var method = data.substring(0, 3);
    var spriteData = [];

    switch (method) {

      case 'hR2':
        var width = this.hexToInt(data.substring(3, 7));
        var height = this.hexToInt(data.substring(7, 11));
        var pointer = 11;
        spriteData[0] = [];
        var maskValue = 0;
        var mask = {0: '-', 1: '#'};
        var counter = this.hexToInt(data.substring(pointer, pointer+2));
        pointer += 2;
        var h = 0;
        while (h < height) {
          spriteData[0][h] = '';
          var w = 0;
          while (w < width) {
            spriteData[0][h] += mask[maskValue];
            counter--;
            while (counter == 0) {
              if (pointer < data.length) {
                counter = this.hexToInt(data.substring(pointer, pointer+2));
                maskValue = 1-maskValue;
                pointer += 2;
              } else {
                counter = 1;
              }
            }
            w++;
          }
          h++;
        }
        break;

      case 'lP1':
        var width = this.latinToInt(data.substring(3, 6));
        var height = this.latinToInt(data.substring(6, 9));
        var pulses = [];
        var pulsesCount = this.latinToInt(data.substring(9, 11));
        var pointer = 11;
        for (var p = 0; p < pulsesCount; p++) {
          var pulse = this.latinToInt(data.substring(11+p*2, 11+p*2+2));
          pulses.push(pulse);
          pointer += 2;
        }
        spriteData[0] = [];
        var maskValue = 0;
        var mask = {0: '-', 1: '#'};
        var counter = pulses[this.latinToInt(data.substring(pointer, pointer+1))];
        pointer++;
        var h = 0;
        while (h < height) {
          spriteData[0][h] = '';
          var w = 0;
          while (w < width) {
            spriteData[0][h] += mask[maskValue];
            counter--;
            if (counter == 0) {
              if (pointer < data.length) {
                counter = pulses[this.latinToInt(data.substring(pointer, pointer+1))];
                maskValue = 1-maskValue;
                pointer++;
              } else {
                counter = 1;
              }
            }
            w++;
          }
          h++;
        }
        break;

      default:
        console.log('Error: unknown compression method '+method);
        return;
    }
    var decompressedSprite = {frames: 1, directions: 1, width: width, height: height, sprite: spriteData};
    if (logAfterDecompress) {
      console.log(JSON.stringify(decompressedSprite, null, 2));
    }
    this.setGraphicsData(decompressedSprite);
  } // setCompressedGraphicsData
  
  
  // methods:
  // hR2 - hex repetition 00..FF
  // lP1 - latin pulses 0..9A..Z
  //
  // sample: console.log(spriteEntity.makeCompressedGraphicsData('hR2', spriteData, 'spriteEntity', 106));

  makeCompressedGraphicsData(method, spriteData, valueName, maxStringLength) {
    var data = valueName+'.setCompressedGraphicsData(\n';
    var compressedData = method;

    switch (method) {

      case 'hR2':
        compressedData += this.intToHex(spriteData.width, 4)+this.intToHex(spriteData.height, 4);
        var counter = 0;
        var spriteChar = '-';
        for (var y = 0; y < spriteData.height; y++) {
          for (var x = 0; x < spriteData.width; x++) {
            if (spriteData.sprite[0][y][x] != spriteChar) {
              while (counter > 255) {
                compressedData += 'FF00';
                counter -= 255;
              }
              compressedData += this.intToHex(counter, 2);
              counter = 1;
              spriteChar = spriteData.sprite[0][y][x];
            } else {
              counter++;
            }
          }
        }
        while (counter > 255) {
          compressedData += 'FF00';
          counter -= 255;
        }
        compressedData += this.intToHex(counter, 2);
        break;

      case 'lP1':
        compressedData += this.intToLatin(spriteData.width, 3)+this.intToLatin(spriteData.height, 3);
        var pulses = [];
        var index = {};
        var counter = 0;

        // first phase - create pulses table with index
        var spriteChar = '-';
        for (var y = 0; y < spriteData.height; y++) {
          for (var x = 0; x < spriteData.width; x++) {
            if (spriteData.sprite[0][y][x] != spriteChar) {
              if (!(counter in index)) {
                if (counter > 1296) {
                  return 'COMPRESS ERROR: to long pulse! (pulse: '+counter+', max: 1296)';
                }
                pulses.push(counter);
                index[counter] = pulses.length-1;
              }
              counter = 1;
              spriteChar = spriteData.sprite[0][y][x];
            } else {
              counter++;
            }
          }
        }
        if (!(counter in index)) {
          if (counter > 1296) {
            return 'COMPRESS ERROR: to long pulse! (pulse: '+counter+', max: 1296)';
          }
          pulses.push(counter);
          index[counter] = pulses.length-1;
        }
        if (pulses.length > 36) {
          return 'COMPRESS ERROR: to much pulses! (pulses: '+pulses.length+', max: 36)';
        }

        // second phase - output pulses table
        console.log(pulses);
        compressedData += this.intToLatin(pulses.length, 2);
        pulses.forEach((pulse) => {
          compressedData += this.intToLatin(pulse, 2);
        });

        // third phase - output compressed data
        counter = 0;
        for (var y = 0; y < spriteData.height; y++) {
          for (var x = 0; x < spriteData.width; x++) {
            if (spriteData.sprite[0][y][x] != spriteChar) {
              compressedData += this.intToLatin(index[counter], 1);
              counter = 1;
              spriteChar = spriteData.sprite[0][y][x];
            } else {
              counter++;
            }
          }
        }
        compressedData += this.intToLatin(index[counter], 1);
        break;
    }
    while (compressedData.length > 0) {
      data += '  \''+compressedData.substring(0, maxStringLength)+'\'';
      compressedData = compressedData.substring(maxStringLength);
      if (compressedData.length > 0) {
        data += ' +\n';
      } else {
        data += ',\n';
      }
    }
    data += '  false\n);';
    return data;
  } // makeCompressedGraphicsData

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

} // SpriteEntity

export default SpriteEntity;
