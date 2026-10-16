const { RasterEntity } = await import('./rasterEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A pixel sprite entity. It decodes character-grid sprite definitions (mono or
 * palette-colored) into pixel lists per frame/direction, caches the rendered frames,
 * and draws the current frame with optional repetition and crop-to-parent clipping.
 *
 * A mono sprite can carry a mask: pixels marked with maskChar (':' by default)
 * are painted in maskColor instead of the pen colour, so the sprite covers the
 * background with paper where its silhouette is and draws ink only where its
 * image is. That is how the sprites of the 8 bit isometric games are stored
 * (image plus mask, ANDed and ORed onto the screen), and it is what lets a
 * plain painter's algorithm occlude correctly: a sprite drawn later wipes
 * whatever its mask covers. maskColor is false by default, which leaves masked
 * pixels transparent and keeps every existing sprite unchanged, and it can be
 * changed at any time - the mask pixels are part of the decoded frame either
 * way.
 *
 * ## How a frame becomes pixels
 *
 * The sprite is a {@link RasterEntity} with **one cache per frame and
 * direction** instead of one. A frame is painted the way every other raster in
 * the library is: the frame's bytes are filled with the background — the
 * `bkColor`, or transparent black — in a single `fill()`, then every pixel of
 * the decoded list is written into the `Uint32Array` view, and the result goes
 * into that frame's cache with one `putImageData`. The colours are CSS strings
 * and stay so in the palettes; `RasterEntity.colorValue()` turns each into a
 * packed pixel once and remembers it.
 *
 * Until 2026-09-06 this class painted through `DrawingCache.paint()`, one
 * `fillRect` per pixel with the colour parsed from its CSS string on every
 * change. That was the library's second way to the pixels next to
 * `RasterEntity`, and it is gone (DECISIONS.md R-014, R-023): whatever is
 * learned about writing pixels is now learned once.
 */
export class SpriteEntity extends RasterEntity {

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
    this.maskChar = ':';
    this.maskColor = false;
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
    /** parts of the sprite lit in another colour this frame; see setTints() */
    this.tints = [];
    /**
     * Whether the lit parts are left for the owner to draw with drawTints() —
     * after the entities that would otherwise cover them. False draws them
     * right after the sprite.
     */
    this.deferTints = false;
  } // constructor

  /**
   * Tells the sprite which parts of it are lit in another colour — a Spectrum
   * sprite standing in cells whose attribute something else has changed (the
   * light beam of Manic Miner) shows the beam's ink there. Each part is drawn
   * over the sprite after the sprite itself, with every opaque pixel of the part
   * in the given colour; the cache is untouched, so this costs nothing when
   * nothing is lit. Set every frame; an empty list turns it off.
   *
   * A lit part is what the machine shows **on top**: the cell's attribute
   * colours whatever is in the cell, including the object that lit it. So when
   * another entity drawn after this sprite covers the part — a conveyor under
   * Willy's feet — the owner sets `deferTints` and calls
   * {@link SpriteEntity#drawTints} once everything else is down.
   * @param {Object[]} tints - [{x, y, width, height, color}], relative to the
   *        sprite, in logical pixels; parts outside the sprite are clipped.
   */
  setTints(tints) {
    this.tints = tints || [];
  } // setTints

  /**
   * The cache the current frame and direction are painted in.
   * @returns {number} The cache index.
   */
  cacheIndex() {
    var d = this.direction;
    if (this.directions == 1) {
      d = 0;
    }
    return this.frame+d*this.frames;
  } // cacheIndex

  /**
   * Draws the lit parts of the current frame over whatever is on the screen,
   * each clipped to the sprite. Called by drawEntity() unless `deferTints` is
   * set, in which case the owner calls it at the right moment.
   */
  drawTints() {
    if (this.spriteData === null || this.tints.length == 0) {
      return;
    }
    var index = this.cacheIndex();
    for (var t = 0; t < this.tints.length; t++) {
      var tint = this.tints[t];
      var x0 = Math.max(0, tint.x), y0 = Math.max(0, tint.y);
      var x1 = Math.min(this.width, tint.x+tint.width), y1 = Math.min(this.height, tint.y+tint.height);
      if (x0 < x1 && y0 < y1) {
        this.app.layout.paintCacheTinted(this, index, {x: x0, y: y0, width: x1-x0, height: y1-y0}, tint.color);
      }
    }
  } // drawTints

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
   * Sets the colour the masked pixels of a mono sprite are painted with, or
   * false to leave them transparent, and clears the cache.
   * @param {string|false} color - The mask (paper) color.
   */
  setMaskColor(color) {
    this.maskColor = color;
    this.cleanCache();
  } // setMaskColor

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
    if ('maskChar' in data) {
      this.maskChar = data.maskChar;
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
   * recording set pixels (with their palette color key when colored, or the mask
   * char when a mono sprite has a mask colour), while tracking the sprite's
   * overall width and height.
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
        // a masked pixel is a pixel as well: it paints the paper colour, so it
        // covers whatever is underneath it. It is recorded whether or not a mask
        // colour is set, so setMaskColor() works at any time; with no mask
        // colour the pixel is simply not painted.
        if (palette == false && row[col] == this.maskChar) {
          spriteFrame.push({x: col, y: r, c: this.maskChar});
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
   * The colour one decoded pixel is painted with in a given frame, resolved the
   * way the sprite has always resolved it: the mask colour for a masked pixel
   * of a mono sprite, the pen colour for a mono pixel, the palette entry (or
   * its per-frame variant) for a coloured one — or false for "do not paint".
   * @param {Object} pixel - A pixel descriptor {x, y, c?}.
   * @param {Object|false} palette - The palette in force for the frame.
   * @param {number} index - The frame index, for per-frame palette colours.
   * @returns {string|false} A CSS colour, or false.
   */
  pixelColor(pixel, palette, index) {
    var color = this.penColor;
    if ('c' in pixel && color !== false && pixel.c == this.maskChar) {
      // mono sprite with a mask: paint the paper colour, or nothing at all when
      // no mask colour is set
      return this.maskColor;
    }
    if ('c' in pixel) {
      if (color == false) {
        // per-frame palette (braille) takes precedence, otherwise the live this.sharedPalette
        if (!palette) {
          return false;
        }
        color = palette[pixel.c];
        if (color && typeof color === 'object') {   // per-frame color: {0:'#aaa', 1:'#bbb', ...}
          color = color[index];
        }
        return color === undefined ? false : color;
      }
      if (pixel.c != this.penChar) {
        return false;
      }
    }
    return color;
  } // pixelColor

  /**
   * Paints one frame into its cache: the background in a single fill, then
   * every pixel of the frame — repeated `repeatX` × `repeatY` times — written
   * into the `Uint32Array` view, and one `putImageData`. RasterEntity's frame
   * buffer is shared by all the caches of this sprite, since they are all the
   * same size and `putImageData` copies.
   * @param {number} index - The frame/direction index being painted.
   * @param {DrawingCache} cache - Its cache.
   */
  paintFrame(index, cache) {
    var frame = this.frameBytes(cache);
    var px = this.pixels;
    var width = this.width, height = this.height;
    px.fill(this.bkColor ? RasterEntity.colorValue(this.bkColor) : 0);

    var palette = this.framePalettes[index] || this.sharedPalette;
    var pixels = this.spriteData[index];
    for (var i = 0; i < pixels.length; i++) {
      var pixel = pixels[i];
      var color = this.pixelColor(pixel, palette, index);
      if (color === false) {
        continue;
      }
      var value = RasterEntity.colorValue(color);
      // a pixel past the entity's edge is dropped, the way the canvas used to
      // clip it — setFixSize() can make the cell smaller than the grid
      for (var rx = 0; rx < this.repeatX; rx++) {
        var col = pixel.x+rx*this.spriteWidth;
        if (col >= width) {
          continue;
        }
        for (var ry = 0; ry < this.repeatY; ry++) {
          var row = pixel.y+ry*this.spriteHeight;
          if (row < height) {
            px[row*width+col] = value;
          }
        }
      }
    }
    cache.ctx.putImageData(frame, 0, 0);
  } // paintFrame

  /**
   * Renders the current frame/direction into its cache when needed and draws it
   * to the main canvas, cropping to the parent bounds when crop rendering is
   * enabled.
   */
  drawEntity() {
    if (this.spriteData !== null) {
      var index = this.cacheIndex();
      var cache = this.drawingCache[index];
      if (cache.preparePaint(this.width, this.height)) {
        this.paintFrame(index, cache);
      }
      this.blitCache(index);
      if (!this.deferTints) {
        this.drawTints();
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
