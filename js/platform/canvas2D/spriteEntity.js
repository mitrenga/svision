/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

/**
 * A pixel sprite entity. It decodes character-grid sprite definitions (mono or
 * palette-colored) into pixel lists per frame/direction, caches the rendered frames,
 * and draws the current frame with optional repetition and crop-to-parent clipping.
 */
export class SpriteEntity  extends AbstractEntity {

  /**
   * Creates a sprite entity.
   * @param {AbstractEntity} parentEntity - The parent entity this sprite is attached to.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {string|false} penColor - Foreground color for mono sprites, or false when using a palette.
   * @param {string|false} bkColor - Background color, or false for transparent.
   * @param {number} frame - The initial frame index.
   * @param {number} direction - The initial direction index.
   */
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

  /**
   * Enables crop-to-parent rendering by creating a crop drawing cache.
   */
  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  /**
   * Disables crop-to-parent rendering by discarding the crop drawing cache.
   */
  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  /**
   * Forces a fixed sprite cell size, updating the entity dimensions according to the
   * current repeat factors.
   * @param {number} width - Fixed sprite cell width.
   * @param {number} height - Fixed sprite cell height.
   */
  setFixSize(width, height) {
    this.fixWidth = width;
    this.fixHeight = height;
    this.width = width*this.repeatX;
    this.height = height*this.repeatY;
    this.spriteWidth = width;
    this.spriteHeight = height;
  } // setFixSize

  /**
   * Sets how many times the sprite repeats horizontally and updates the width.
   * @param {number} value - The horizontal repeat count.
   */
  setRepeatX(value) {
    this.repeatX = value;
    this.width = this.spriteWidth*value;
  } // setRepeatX

  /**
   * Sets how many times the sprite repeats vertically and updates the height.
   * @param {number} value - The vertical repeat count.
   */
  setRepeatY(value) {
    this.repeatY = value;
    this.height = this.spriteHeight*value;
  } // setRepeatY

  /**
   * Sets the mono pen color, disables any shared palette, and clears the cache.
   * @param {string} color - The new pen color.
   */
  setPenColor(color) {
    this.penColor = color;
    this.sharedPalette = false;
    this.cleanCache();
  }

  /**
   * Sets the shared (sprite-wide) palette, disables the mono pen color, and clears the cache.
   * @param {Object} palette - The palette mapping characters to colors.
   */
  setSharedPalette(palette) {
    this.sharedPalette = palette;
    this.penColor = false;
    this.cleanCache();
  } // setSharedPalette

  /**
   * Extracts the character grid from a decoded frame. A decoded frame is either
   * a plain array of rows (mono hR2/lP1/lT2) or an object {grid, colors?}
   * (colored braille).
   * @param {Array|Object} frame - The decoded frame (rows array or {grid, colors}).
   * @returns {Array} The grid of rows.
   */
  frameGrid(frame) {
    return (frame && frame.grid) ? frame.grid : frame;
  } // frameGrid

  /**
   * Resolves the palette to use for a frame. Priority: the frame's own per-frame
   * colors > this.sharedPalette > false (mono rendering via penChar).
   * @param {Array|Object} frame - The decoded frame.
   * @returns {Object|false} The palette to use, or false for mono rendering.
   */
  resolvePalette(frame) {
    return (frame && frame.colors) ? frame.colors : this.sharedPalette;
  } // resolvePalette

  /**
   * Loads sprite graphics data, configuring pen character, frame and direction
   * counts, and shared palette, then decodes every frame into pixel data and
   * allocates a drawing cache per frame.
   * @param {Object} data - The graphics data (sprite definition, frames, directions, colors, penChar).
   */
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

  /**
   * Decodes a character grid into a list of pixel descriptors, scanning each cell and
   * recording set pixels (with their palette color key when colored), while tracking
   * the sprite's overall width and height.
   * @param {Array} grid - The grid of character rows describing the frame.
   * @param {Object|false} palette - The palette mapping characters to colors, or false for mono.
   * @returns {Array} The list of pixel descriptors for the frame.
   */
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

  /**
   * Decodes and appends an additional frame to the sprite, allocating a drawing cache
   * for it and recomputing dimensions.
   * @param {Array} grid - The grid of character rows describing the frame.
   * @param {Object|false} palette - The per-frame palette, or false/undefined to use the shared palette.
   * @returns {Array} The decoded pixel data for the new frame.
   */
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

  /**
   * Recomputes the entity width and height from the sprite size (or fixed size) and
   * the horizontal/vertical repeat factors.
   */
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

  /**
   * Renders the current frame/direction into its cache when needed (applying the
   * resolved color per pixel and any repetition) and draws it to the main canvas,
   * cropping to the parent bounds when crop rendering is enabled.
   */
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

  /**
   * Marks every frame/direction drawing cache as dirty so they are re-rendered.
   */
  cleanCache() {
    for (var d = 0; d < this.directions; d++) {
      for (var f = 0; f < this.frames; f++) {
        this.drawingCache[f+d*this.frames].cleanCache();
      }
    }
  } // cleanCache

} // SpriteEntity

export default SpriteEntity;
