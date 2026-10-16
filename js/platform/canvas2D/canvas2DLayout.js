const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
const { DrawingCache } = await import('./drawingCache.js?ver='+window.srcVersion);
const { Tool } = await import('../../tool.js?ver='+window.srcVersion);
// begin code

/**
 * Layout implementation for the HTML canvas 2D platform. It computes the
 * desktop/border sizing on resize, clears and paints rectangles onto the canvas
 * context, manages drawing caches, and converts client coordinates into model
 * coordinates.
 */
export class Canvas2DLayout extends AbstractLayout {

  /**
   * Creates the canvas 2D layout.
   * @param {Object} app - The application instance owning this layout.
   */
  constructor(app) {
    super(app);
    this.app = app;
    this.id = 'Canvas2DLayout';
    this.ratio = 1;

    // Display style: 'sharp' renders sharp pixel edges (image smoothing off),
    // 'crt' imitates an old CRT monitor (image smoothing on, scanline/vignette
    // overlay, color filter), 'grid' is 'crt' without the color filter for
    // devices whose browsers cannot composite a CSS filter over the canvas.
    // 'retro' resolves to 'crt' or 'grid' by the smart-TV heuristic in
    // resolveDisplayStyle(); the explicit values are honored as-is. The user
    // choice is read from the 'displayStyle' cookie; a missing or invalid
    // cookie falls back to 'sharp'.
    this.displayStyle = Tool.readCookie('displayStyle', 'sharp');
    if (['sharp', 'grid', 'crt', 'retro'].indexOf(this.displayStyle) == -1) {
      this.displayStyle = 'sharp';
    }

    // Tuning constants for the 'crt' display style. Every part can be disabled
    // separately (overlay: false, filter: '', cornerRadius: ''), which also
    // helps bisecting rendering problems on devices without a console.
    this.crtStyle = {
      overlay: true,        // false removes the scanline/vignette overlay element entirely
      scanlineAlpha: 0.22,  // darkness of the horizontal scanline gaps
      gridAlpha: 0.10,      // darkness of the vertical pixel-grid lines
      gridMinStep: 3,       // vertical grid only when a logical pixel spans at least this many CSS pixels
      vignetteAlpha: 0.25,  // strength of the corner darkening
      cornerRadius: '12px', // rounded screen corners
      // brightens/saturates the picture and compensates the overlay darkening
      // (used by 'crt' only; 'grid' always skips the filter)
      filter: 'contrast(1.12) saturate(1.25) brightness(1.08)'
    };
    this.crtOverlay = false; // lazily created <canvas> holding the scanlines and vignette
  } // constructor

  /**
   * Recomputes border widths/heights so the desktop fits the canvas element while
   * preserving aspect ratio, resizes the canvas, and repositions the border and
   * desktop entities accordingly.
   * @param {Object} model - The model holding desktop dimensions and border/desktop entities.
   */
  resizeModel(model) {
    super.resizeModel(model);

    var xRatio = this.app.element.clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = this.app.element.clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < xRatio) {
      model.borderHeight = model.minimalBorder;
      model.borderWidth = Math.round((this.app.element.clientWidth/yRatio-model.desktopWidth)/2);
    } else {
      model.borderWidth = model.minimalBorder;
      model.borderHeight = Math.round((this.app.element.clientHeight/xRatio-model.desktopHeight)/2);
    } 

    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;
    this.applyDisplayStyle();

    if (model.borderEntity != null) {
      model.borderEntity.x = 0;
      model.borderEntity.y = 0;
      model.borderEntity.width = model.desktopWidth+2*model.borderWidth;
      model.borderEntity.height = model.desktopHeight+2*model.borderHeight;
      model.borderEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
      model.borderEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
    }

    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth+2*model.borderWidth;
    model.desktopEntity.parentHeight = model.desktopHeight+2*model.borderHeight;
  } // resizeModel

  /**
   * Resolves the configured display style to a concrete one. Explicit values
   * pass through unchanged; 'retro' picks 'grid' on smart-TV browsers,
   * where a CSS filter over the accelerated canvas may render the whole layer
   * black (seen on a 2018 Tizen TV; no error is thrown, so it cannot be
   * caught), and full 'crt' elsewhere. A TV whose browser handles the filter
   * can still be given 'crt' explicitly.
   * @returns {string} 'sharp', 'crt' or 'grid'.
   */
  resolveDisplayStyle() {
    if (this.displayStyle != 'retro') {
      return this.displayStyle;
    }
    if (/Tizen|SMART-TV|SmartTV|Web0S|WebOS|NetCast/i.test(navigator.userAgent)) {
      return 'grid';
    }
    return 'crt';
  } // resolveDisplayStyle

  /**
   * Applies the current display style (resolved via resolveDisplayStyle()) to
   * the canvas. In the 'sharp' style, image smoothing is disabled so drawing
   * caches kept in logical resolution are scaled up with sharp pixel edges. In
   * the 'crt' style, smoothing stays enabled (soft edges), a color filter is
   * set on the canvas element and a scanline/vignette overlay is placed above
   * it. 'grid' equals 'crt' without the color filter. Smoothing is a
   * context state which resets whenever the canvas element is resized, so this
   * must be called again after every change of the element dimensions.
   */
  applyDisplayStyle() {
    var style = this.resolveDisplayStyle();
    if (style == 'crt' || style == 'grid') {
      // The CRT look is purely cosmetic: if anything in it fails (very old TV
      // browsers lack parts of the DOM/canvas API), fall back to the 'sharp'
      // style instead of letting the exception kill the app startup.
      try {
        this.app.stack.ctx.imageSmoothingEnabled = true;
        this.app.stack.ctx.webkitImageSmoothingEnabled = true;
        if (style == 'crt') {
          this.app.element.style.filter = this.crtStyle.filter;
        } else {
          this.app.element.style.filter = '';
        }
        this.app.element.style.borderRadius = this.crtStyle.cornerRadius;
        this.updateCRTOverlay(this.crtStyle.overlay !== false);
        return;
      } catch (error) {
        this.displayStyle = 'sharp';
        if (this.crtOverlay !== false && this.crtOverlay.parentNode) {
          this.crtOverlay.parentNode.removeChild(this.crtOverlay);
        }
        this.crtOverlay = false;
        if (window.console) {
          console.error('CRT display style failed, falling back to \'sharp\': '+error);
        }
      }
    }
    this.app.stack.ctx.imageSmoothingEnabled = false;
    this.app.stack.ctx.webkitImageSmoothingEnabled = false;
    this.app.element.style.filter = '';
    this.app.element.style.borderRadius = '';
    this.updateCRTOverlay(false);
  } // applyDisplayStyle

  /**
   * Creates, updates or removes the CRT overlay element. The overlay is a
   * non-interactive <canvas> covering exactly the app canvas; the vignette is
   * its CSS background, while the scanlines (and a vertical pixel grid at high
   * scale ratios) are drawn into its bitmap in physical device pixels, with
   * every line snapped to whole device pixels. CSS gradients are not used for
   * the grid because with a fractional devicePixelRatio (125%/150% display
   * scaling on Windows/Linux) their lines alternate between physical pixel
   * counts and produce visible moiré stripes. Called from applyDisplayStyle()
   * on every resize, because the ratio and the canvas geometry may have changed.
   * @param {boolean} enabled - True to show the overlay, false to remove it.
   */
  updateCRTOverlay(enabled) {
    if (!enabled) {
      if (this.crtOverlay !== false) {
        // removeChild instead of remove() for old browsers (pre-2014 WebKit TVs)
        this.crtOverlay.parentNode.removeChild(this.crtOverlay);
        this.crtOverlay = false;
      }
      return;
    }

    if (this.crtOverlay === false) {
      this.crtOverlay = document.createElement('canvas');
      this.crtOverlay.id = 'crtOverlay';
      this.crtOverlay.style.position = 'absolute';
      this.crtOverlay.style.pointerEvents = 'none';
      // the overlay is positioned relative to the parent element hosting the canvas
      if (this.app.parentElement.style.position == '') {
        this.app.parentElement.style.position = 'relative';
      }
      this.app.parentElement.appendChild(this.crtOverlay);
    }

    var element = this.app.element;
    this.crtOverlay.style.borderRadius = this.crtStyle.cornerRadius;
    this.crtOverlay.style.background = 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,'+this.crtStyle.vignetteAlpha+') 100%)';
    // safety net: if the box still gets resampled, use nearest neighbor so the
    // line thickness cannot smear across two device pixels
    this.crtOverlay.style.imageRendering = 'pixelated';

    // The overlay bitmap is kept in physical device pixels so the grid lines
    // can be snapped to them regardless of the display scaling. The CSS box is
    // snapped to whole device pixels too, using intentionally fractional CSS
    // values (with fractional display scaling, e.g. 125% on Windows, whole CSS
    // pixels do not land on device pixel boundaries and the bitmap would be
    // resampled, thinning some lines). Measured via getBoundingClientRect(),
    // because clientWidth/offsetLeft are rounded and hide the fractional part.
    var dpr = window.devicePixelRatio || 1;
    var rect = element.getBoundingClientRect();
    var parentRect = this.app.parentElement.getBoundingClientRect();
    // very old browsers return a rect without width/height properties
    var rectWidth = rect.width;
    var rectHeight = rect.height;
    if (rectWidth === undefined) {
      rectWidth = rect.right-rect.left;
      rectHeight = rect.bottom-rect.top;
    }
    var leftDev = Math.round((rect.left-parentRect.left)*dpr);
    var topDev = Math.round((rect.top-parentRect.top)*dpr);
    var width = Math.round(rectWidth*dpr);
    var height = Math.round(rectHeight*dpr);
    this.crtOverlay.style.left = (leftDev/dpr)+'px';
    this.crtOverlay.style.top = (topDev/dpr)+'px';
    this.crtOverlay.style.width = (width/dpr)+'px';
    this.crtOverlay.style.height = (height/dpr)+'px';
    this.crtOverlay.width = width;
    this.crtOverlay.height = height;

    var ctx = this.crtOverlay.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Size of one logical pixel in device pixels (canvas pixels may differ
    // from CSS pixels, e.g. the ZX Spectrum layout ceils its borders so the
    // canvas bitmap is a few pixels larger than its CSS box). The step is
    // rounded to whole device pixels and used uniformly: a real CRT has evenly
    // spaced scanlines regardless of the content, and a fractional step would
    // force an occasional narrower gap (visible as regular stripes).
    var stepX = 1;
    var stepY = 1;
    if (element.width > 0 && element.height > 0) {
      stepX = Math.round(this.ratio*width/element.width);
      stepY = Math.round(this.ratio*height/element.height);
    }
    // line thickness of 1 CSS pixel expressed in whole device pixels; constant
    // thickness everywhere is what prevents the moiré stripes
    var thickness = Math.max(1, Math.round(dpr));

    if (stepY >= 2*thickness) {
      ctx.fillStyle = 'rgba(0,0,0,'+this.crtStyle.scanlineAlpha+')';
      for (var y = stepY; y < height+0.5; y += stepY) {
        ctx.fillRect(0, Math.round(y)-thickness, width, thickness);
      }
    }
    if (stepX >= this.crtStyle.gridMinStep*dpr) {
      ctx.fillStyle = 'rgba(0,0,0,'+this.crtStyle.gridAlpha+')';
      for (var x = stepX; x < width+0.5; x += stepX) {
        ctx.fillRect(Math.round(x)-thickness, 0, thickness, height);
      }
    }
  } // updateCRTOverlay

  /**
   * Clears the entire canvas element.
   */
  clearCanvas() {
    this.app.stack.ctx.clearRect(0, 0, this.app.element.clientWidth, this.app.element.clientHeight);
  } // clearCanvas

  /**
   * Paints a rectangle relative to an entity's absolute position onto the main canvas.
   * @param {AbstractEntity} entity - The entity providing the coordinate origin.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(entity, x, y, width, height, color) {
    this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, color);
  } // paint

  /**
   * Paints a rectangle relative to an entity while clipping it to the visible area
   * defined by the entity and its parent bounds.
   * @param {AbstractEntity} entity - The entity providing the coordinate origin and bounds.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paintWithVisibility(entity, x, y, width, height, color) {
    this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, width, height, color);
    if (entity.x+x < 0) {
      w = w+entity.x;
      x = -entity.x;
      if (w < 0) {
        w = 0;
      }
    }
    if (x < 0) {
      w = w+x;
      x = 0;
      if (w < 0) {
        w = 0;
      }
    }
    if (entity.x+x+w > entity.parentWidth) {
      w = entity.parentWidth-entity.x-x;
      if (w < 0) {
        w = 0;
      }
    }
    if (x+w > entity.width) {
      w = entity.width-x;
      if (w < 0) {
        w = 0;
      }
    }
    var h = height;
    if (entity.y+y < 0) {
      h = h+entity.y;
      y = -entity.y;
      if (h < 0) {
        h = 0;
      }
    }
    if (y < 0) {
      h = h+y;
      y = 0;
      if (h < 0) {
        h = 0;
      }
    }
    if (entity.y+y+h > entity.parentHeight) {
      h = entity.parentHeight-entity.y-y;
      if (h < 0) {
        h = 0;
      }
    }
    if (y+h > entity.height) {
      h = entity.height-y;
      if (h < 0) {
        h = 0;
      }
    }
    if (w > 0 && h > 0) {
      this.paintRect(this.app.stack.ctx, entity.parentX+entity.x+x, entity.parentY+entity.y+y, w, h, color);
    }
  } // paintWithVisibility

  /**
   * Fills a rectangle on the given context, scaling all coordinates by the layout ratio.
   * @param {CanvasRenderingContext2D} ctx - The target drawing context.
   * @param {number} x - X position in model coordinates.
   * @param {number} y - Y position in model coordinates.
   * @param {number} width - Rectangle width in model coordinates.
   * @param {number} height - Rectangle height in model coordinates.
   * @param {string} color - Fill color.
   */
  paintRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*this.ratio, y*this.ratio, width*this.ratio, height*this.ratio);
  } // paintRect

  /**
   * Creates a new drawing cache slot for an entity at the given index.
   * @param {AbstractEntity} entity - The entity to attach the cache to.
   * @param {number} index - The cache slot index.
   */
  newDrawingCache(entity, index) {
    entity.drawingCache[index] = new DrawingCache(entity.app);
  } // newDrawingCache

  /**
   * Creates the crop cache used to render an entity clipped to its parent bounds.
   * @param {AbstractEntity} entity - The entity to attach the crop cache to.
   */
  newDrawingCropCache(entity) {
    entity.drawingCropCache = new DrawingCache(entity.app);
  } // newDrawingCropCache

  /**
   * Draws a cached entity image onto the main canvas at the entity's absolute
   * position, scaling it from the cache's logical resolution by the layout ratio.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   */
  paintCache(entity, index) {
    var cache = entity.drawingCache[index];
    this.app.stack.ctx.drawImage(cache.canvas, (entity.parentX+entity.x)*this.ratio, (entity.parentY+entity.y)*this.ratio, cache.canvas.width*this.ratio, cache.canvas.height*this.ratio);
  } // paintCache

  /**
   * Draws a cropped/offset portion of an entity's cached image onto the main canvas,
   * refreshing the crop cache as needed.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   * @param {number} posX - X offset into the source cache image.
   * @param {number} posY - Y offset into the source cache image.
   * @param {number} moveX - Additional X offset applied to the destination position.
   * @param {number} moveY - Additional Y offset applied to the destination position.
   */
  paintCropCache(entity, index, posX, posY, moveX, moveY) {
    var cropCache = entity.drawingCropCache;
    cropCache.preparePaint(entity.width, entity.height);
    cropCache.ctx.clearRect(0, 0, cropCache.canvas.width, cropCache.canvas.height);
    // both caches are in logical resolution, so the crop copy is an unscaled blit
    cropCache.ctx.drawImage(entity.drawingCache[index].canvas, -posX, -posY);
    entity.app.stack.ctx.drawImage(cropCache.canvas, (entity.parentX+entity.x+moveX)*this.ratio, (entity.parentY+entity.y+moveY)*this.ratio, cropCache.canvas.width*this.ratio, cropCache.canvas.height*this.ratio);
  } // paintCropCache

  /**
   * Draws a rectangle of an entity's cached image onto the main canvas **in one
   * flat colour**: every opaque pixel of that part of the cache comes out in
   * `color`, every transparent one stays transparent. That is what a Spectrum
   * does to a sprite standing in a cell whose attribute was changed under it —
   * the light beam of Manic Miner — and it used to be done one `fillRect` per
   * pixel. Here it is three canvas operations: the part is copied into a scratch
   * cache in logical resolution, filled with `source-in` (which paints only
   * where the copy is opaque), and blitted scaled like any cache.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index.
   * @param {Object} rect - {x, y, width, height} of the part, relative to the entity, in logical pixels.
   * @param {string} color - The colour every opaque pixel of the part is painted in.
   */
  paintCacheTinted(entity, index, rect, color) {
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    if (!this.tintCache) {
      this.tintCache = new DrawingCache(this.app);
    }
    var scratch = this.tintCache;
    scratch.preparePaint(rect.width, rect.height);
    var ctx = scratch.ctx;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(entity.drawingCache[index].canvas, -rect.x, -rect.y);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalCompositeOperation = 'source-over';
    this.app.stack.ctx.drawImage(scratch.canvas, (entity.parentX+entity.x+rect.x)*this.ratio, (entity.parentY+entity.y+rect.y)*this.ratio, rect.width*this.ratio, rect.height*this.ratio);
  } // paintCacheTinted

  /**
   * Draws an image — a decoded PNG, say — onto the main canvas at a position
   * relative to an entity, scaled by the layout ratio like every cache. The one
   * kind of picture that does not go through a RasterEntity's frame: it is
   * already pixels, and the browser decoded it.
   * @param {AbstractEntity} entity - The entity the position is relative to.
   * @param {HTMLImageElement} image - A loaded image.
   * @param {number} x - X offset relative to the entity, in logical pixels.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Width in logical pixels the image is fitted to.
   * @param {number} height - Height in logical pixels.
   */
  paintImage(entity, image, x, y, width, height) {
    this.app.stack.ctx.drawImage(image, (entity.parentX+entity.x+x)*this.ratio, (entity.parentY+entity.y+y)*this.ratio, width*this.ratio, height*this.ratio);
  } // paintImage

  /**
   * Draws a part of an image (a cache canvas, as a rule) into the entity —
   * `paintImage` with a source rectangle, for a platform whose picture is
   * larger than the desktop shows: the Atari 8-bit frame is 240 scan lines
   * and a game may show a window of it.
   * @param {AbstractEntity} entity - The entity being painted.
   * @param {Object} image - The image or canvas to draw.
   * @param {number} sx - Left of the source rectangle, in the image's pixels.
   * @param {number} sy - Top of the source rectangle.
   * @param {number} sWidth - Width of the source rectangle.
   * @param {number} sHeight - Height of the source rectangle.
   * @param {number} x - X in the entity.
   * @param {number} y - Y in the entity.
   * @param {number} width - Logical width to fit the part to.
   * @param {number} height - Logical height to fit the part to.
   */
  paintImagePart(entity, image, sx, sy, sWidth, sHeight, x, y, width, height) {
    this.app.stack.ctx.drawImage(image, sx, sy, sWidth, sHeight,
      (entity.parentX+entity.x+x)*this.ratio, (entity.parentY+entity.y+y)*this.ratio,
      width*this.ratio, height*this.ratio);
  } // paintImagePart

  /**
   * Strokes a {@link VectorDisplayList} of an entity onto the main canvas —
   * the bridge that lets a {@link VectorEntity} sit over a raster game. The
   * list is drawn in the entity's coordinates scaled by the layout ratio and
   * clipped to the entity's visible rectangle when it clips.
   * @param {AbstractEntity} entity - The entity owning the list.
   * @param {VectorDisplayList} list - The primitives to draw.
   */
  paintDisplayList(entity, list) {
    var ctx = this.app.stack.ctx;
    var r = this.ratio;
    ctx.save();
    ctx.translate((entity.parentX+entity.x)*r, (entity.parentY+entity.y)*r);
    if (entity.clipsList) {
      var cx = Math.max(0, entity.parentCoverX-entity.x);
      var cy = Math.max(0, entity.parentCoverY-entity.y);
      var cw = Math.min(entity.width, entity.parentWidth-entity.x)-cx;
      var ch = Math.min(entity.height, entity.parentHeight-entity.y)-cy;
      ctx.beginPath();
      ctx.rect(cx*r, cy*r, Math.max(0, cw)*r, Math.max(0, ch)*r);
      ctx.clip();
    }
    ctx.scale(r, r);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    list.items.forEach((item) => {
      ctx.globalAlpha = item.opacity*(item.intensity/15);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.strokeWidth;
      ctx.fillStyle = item.fill;
      var i;
      switch (item.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.stroke();
          break;
        case 'polyline':
        case 'polygon':
          ctx.beginPath();
          for (i = 0; i+1 < item.points.length; i += 2) {
            if (i == 0) {
              ctx.moveTo(item.points[i], item.points[i+1]);
            } else {
              ctx.lineTo(item.points[i], item.points[i+1]);
            }
          }
          if (item.type == 'polygon' || item.close) {
            ctx.closePath();
          }
          if (item.fill != 'none') {
            ctx.fill();
          }
          ctx.stroke();
          break;
        case 'rect':
          if (item.fill != 'none') {
            ctx.fillRect(item.x, item.y, item.width, item.height);
          }
          ctx.strokeRect(item.x, item.y, item.width, item.height);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(item.cx, item.cy, item.r, 0, 2*Math.PI);
          if (item.fill != 'none') {
            ctx.fill();
          }
          ctx.stroke();
          break;
        case 'text':
          ctx.fillStyle = item.color;
          ctx.font = item.weight+' '+item.size+'px '+item.font;
          ctx.textAlign = item.anchor == 'middle' ? 'center' : (item.anchor == 'end' ? 'right' : 'left');
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(item.text, item.x, item.y);
          break;
        case 'path':
          var path = new Path2D(item.d);
          if (item.fill != 'none') {
            ctx.fill(path);
          }
          ctx.stroke(path);
          break;
      }
    });
    ctx.restore();
  } // paintDisplayList

  /**
   * Converts a client (DOM) X coordinate into a model X coordinate, undoing the
   * layout ratio the drawing side applies (paintRect, paintCache). Every
   * subclass used to carry an identical copy of this with the ratio in it while
   * the base had it without; the ratio belongs here, because the base keeps it
   * at 1 and dividing by 1 changes nothing for a layout that does not scale.
   * @param {number} clientX - The client X coordinate.
   * @returns {number} The corresponding model X coordinate.
   */
  convertClientCoordinateX(clientX) {
    return Math.round(this.app.element.width/this.ratio/this.app.element.clientWidth*clientX);
  } // convertClientCoordinateX

  /**
   * Converts a client (DOM) Y coordinate into a model Y coordinate — see
   * convertClientCoordinateX() for why the ratio is here and not in the
   * subclasses.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding model Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round(this.app.element.height/this.ratio/this.app.element.clientHeight*clientY);
  } // convertClientCoordinateY

} // Canvas2DLayout
