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
    this.sharedPalette = false;
    this.framePalettes = [];
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
  } // setFixSize

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
    this.sharedPalette = false;
    this.cleanCache();
  }

  setSharedPalette(palette) {
    this.sharedPalette = palette;
    this.penColor = false;
    this.cleanCache();
  } // setSharedPalette

  // a decoded frame is either an array of rows (mono hR2/lP1/lT2),
  // or {grid:[...], colors?:{...}} (colored braille)
  frameGrid(frame) {
    return (frame && frame.grid) ? frame.grid : frame;
  } // frameGrid

  // palette priority: per-frame colors > this.sharedPalette > false (mono)
  resolvePalette(frame) {
    return (frame && frame.colors) ? frame.colors : this.sharedPalette;
  } // resolvePalette

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
    if ('colors' in data) {
      this.sharedPalette = data.colors;
      if (this.sharedPalette !== false) {
        this.penColor = false;
      }
    }
    this.spriteData = [];
    this.framePalettes = [];
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.drawCache = [];
    this.drawCacheRatio = [];
    this.drawCacheCtx = [];

    if (this.frames == 0) {
      this.spriteData[0] = this.buildFrameData(this.frameGrid(data.sprite), this.resolvePalette(data.sprite));
      this.frames = 1;
      this.directions = 1;
      this.app.layout.newDrawingCache(this, 0);
    } else {
      if (this.directions == 0) {
        this.directions = 1;
      }
      for (var s = 0; s < data.sprite.length; s++) {
        var frame = data.sprite[s];
        // the sprite-wide palette is read live from this.sharedPalette; framePalettes only holds the per-frame palette
        if (frame && frame.colors) {
          this.framePalettes[s] = frame.colors;
        }
        this.spriteData[s] = this.buildFrameData(this.frameGrid(frame), this.resolvePalette(frame));
        this.app.layout.newDrawingCache(this, s);
      }
    }
    this.setDimensions();
  } // setGraphicsData

  buildFrameData(grid, palette) {
    var spriteFrame = [];
    var spriteFrameWidth = 0;
    var spriteFrameHeight = 0;
    grid.forEach((row, r) => {
      for (var col = 0; col < row.length; col++) {
        var isPixel = false;
        if (palette == false && row[col] == this.penChar) {
          spriteFrame.push({x: col, y: r});
          isPixel = true;
        }
        if (palette != false) {
          if (row[col] in palette && palette[row[col]] !== false) {
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
  } // buildFrameData

  // palette: per-frame palette, or false/undefined for mono (penChar) / sharedPalette
  addFrameData(grid, palette) {
    if (this.directions == 0) {
      this.directions = 1;
    }
    var index = this.frames;
    if (palette) {
      this.framePalettes[index] = palette;
    }
    this.spriteData[index] = this.buildFrameData(grid, palette || this.sharedPalette);
    this.app.layout.newDrawingCache(this, index);
    this.frames++;
    this.setDimensions();
    return this.spriteData[index];
  } // addFrameData

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
              // per-frame palette (braille) takes precedence, otherwise the live this.sharedPalette
              var palette = this.framePalettes[index] || this.sharedPalette;
              if (palette) {
                color = palette[pixel.c];
                if (color && typeof color === 'object') {   // per-frame color: {0:'#aaa', 1:'#bbb', ...}
                  color = color[index];
                }
              }
            } else {
              if (pixel.c != this.penChar) {
                color = false;
              }
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
        if ((this.x-this.parentCoverX >= 0) && (this.y-this.parentCoverY >= 0) && (this.x+this.width-1 <= this.parentWidth) && (this.y+this.height-1 <= this.parentHeight)) {
          this.app.layout.paintCache(this, index);
        } else {
          var cropX = 0;
          if (this.x-this.parentCoverX < 0) {
            cropX = this.x-this.parentCoverX;
          }
          if (this.x+this.width > this.parentWidth) {
            cropX = this.x+this.width-this.parentWidth;
          }
          var cropY = 0;
          if (this.y-this.parentCoverY < 0) {
            cropY = this.y-this.parentCoverY;
          }
          if (this.y+this.height > this.parentHeight) {
            cropY = this.y+this.height-this.parentHeight;
          }
          this.app.layout.paintCropCache(this, index, -cropX, -cropY, -cropX, -cropY);
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
