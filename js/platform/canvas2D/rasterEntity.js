const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
// begin code

/**
 * An entity whose picture is **pixels, not shapes**: it owns an `ImageData` in
 * the entity's own logical resolution, lets the game fill it, and blits it to
 * the screen scaled by the layout ratio.
 *
 * Every game that draws a machine's screen was writing this for itself. The
 * body is always the same and only one line differs — the one that fills the
 * bytes:
 *
 * ```js
 * var cache = this.drawingCache[0];
 * if (cache.preparePaint(this.width, this.height)) {
 *   if (this.imageData === null || this.imageData.width != this.width) {
 *     this.imageData = cache.ctx.createImageData(this.width, this.height);
 *   }
 *   this.render.renderRoom(this.imageData.data, ...);   // <- only this
 *   cache.ctx.putImageData(this.imageData, 0, 0);
 * }
 * this.app.layout.paintCache(this, 0);
 * ```
 *
 * Here that line is {@link RasterEntity#paintRaster}, and everything around it
 * belongs to the library.
 *
 * ## What it costs
 *
 * The pixel work runs **once per game frame, not once per display frame**:
 * `preparePaint()` lets it through only when the cache is dirty, so a screen
 * where nothing moved is a single `drawImage`. Call
 * {@link RasterEntity#invalidate} after changing whatever `paintRaster` reads.
 *
 * ## Before the first frame there is nothing to paint
 *
 * A game whose picture comes from a worker has no picture at all until the
 * first message arrives, and painting an empty state is not nothing — it is a
 * frame of the wrong picture, which flashes by as the game starts. There is no
 * `isReady()` hook here on purpose, because "ready" means something different
 * in every game; the entity says so itself:
 *
 * ```js
 * drawEntity() {
 *   if (this.frameState === null) {   // nothing has arrived yet
 *     return;
 *   }
 *   super.drawEntity();
 * }
 * ```
 *
 * The other way round works as well — paint the picture the machine shows when
 * it is switched on, the way `spaceinvaders` fills the frame with black.
 *
 * ## Which memory, and where the logical operations live
 *
 * This is the raster layer — RGBA bytes on their way to the canvas. The
 * machine's own memory is a layer below it and keeps its own shape and its own
 * write side: {@link ZXVideoRAM} holds a bitmap plus attributes and pokes into
 * it with `'none'`, `'xor'`, `'and'` or `'or'`, because those are the
 * operations the original's instructions do. XOR of an RGBA pixel means
 * nothing; XOR of a bitmap byte is an instruction. So games keep their
 * videoram, and hand its pixels to `paintRaster`.
 *
 * A raster that has no machine memory under it — a tile map decoded straight
 * to colour, or a picture composed pixel by pixel — writes into the bytes it
 * is handed, or through the `Uint32Array` view of {@link RasterEntity#pixels}
 * when a whole pixel at a time is easier than four bytes, or by rectangles
 * through {@link RasterEntity#paintRect} when it is text.
 *
 * ## The pieces an entity with its own draw order takes
 *
 * {@link SpriteEntity} has a cache per animation frame, {@link TextEntity} crops
 * to its parent, {@link SlidingTextEntity} paints a frame wider than itself and
 * shows a moving window of it. They override `drawEntity()` and put it together
 * from the same pieces every raster uses: {@link RasterEntity#paintBackground},
 * {@link RasterEntity#frameBytes}, {@link RasterEntity#paintRect} /
 * {@link RasterEntity#pixels}, and {@link RasterEntity#blitCache}.
 */
export class RasterEntity extends AbstractEntity {

  /**
   * Whether this machine stores a `Uint32Array` low byte first, which decides
   * how a colour is packed for {@link RasterEntity#pixels}.
   * @returns {boolean} True on a little-endian machine.
   */
  static get littleEndian() {
    if (RasterEntity.littleEndianValue === undefined) {
      RasterEntity.littleEndianValue =
        new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    }
    return RasterEntity.littleEndianValue;
  } // littleEndian

  /**
   * Packs a colour into one `Uint32Array` element of an `ImageData`, in the
   * byte order this machine uses.
   * @param {string} color - '#rrggbb'.
   * @param {number} [alpha] - 0-255, opaque by default.
   * @returns {number} The value to write into {@link RasterEntity#pixels}.
   */
  static rgbaValue(color, alpha) {
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);
    var a = alpha === undefined ? 255 : alpha;
    return (RasterEntity.littleEndian
      ? (a << 24) | (b << 16) | (g << 8) | r
      : (r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  } // rgbaValue

  /**
   * Packs **any** CSS colour into a `Uint32Array` element — `'#rgb'`,
   * `'#rrggbb'`, `'#rrggbbaa'`, `'red'`, `'rgb(…)'`, whatever a game hands
   * over as `penColor`. Hex is parsed here; everything else is normalised by
   * a canvas context, the one place that knows every CSS colour. Results are
   * cached by the string, so a colour costs a parse once and a lookup after.
   * @param {string} color - Any CSS colour.
   * @returns {number} The value to write into {@link RasterEntity#pixels}.
   */
  static colorValue(color) {
    var value = RasterEntity.colorValues.get(color);
    if (value !== undefined) {
      return value;
    }
    var hex = /^#([0-9a-f]{3,8})$/i.exec(color);
    if (hex && hex[1].length !== 5 && hex[1].length !== 7) {
      var digits = hex[1];
      if (digits.length <= 4) {          // #rgb / #rgba -> #rrggbb / #rrggbbaa
        digits = digits.replace(/./g, '$&$&');
      }
      value = RasterEntity.rgbaValue('#'+digits.substr(0, 6),
        digits.length === 8 ? parseInt(digits.substr(6, 2), 16) : 255);
    } else {
      // not hex: the canvas normalises it to '#rrggbb' or 'rgba(r, g, b, a)'
      var ctx = RasterEntity.scratchContext();
      ctx.fillStyle = color;
      var normalized = String(ctx.fillStyle);
      if (normalized.charAt(0) === '#') {
        value = RasterEntity.rgbaValue(normalized);
      } else {
        var parts = /rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/.exec(normalized);
        var r = parts ? +parts[1] : 0, g = parts ? +parts[2] : 0, b = parts ? +parts[3] : 0;
        var a = parts && parts[4] !== undefined ? Math.round(parseFloat(parts[4])*255) : 255;
        value = (RasterEntity.littleEndian
          ? (a << 24) | (b << 16) | (g << 8) | r
          : (r << 24) | (g << 16) | (b << 8) | a) >>> 0;
      }
    }
    RasterEntity.colorValues.set(color, value);
    return value;
  } // colorValue

  /**
   * A 1x1 canvas context kept for normalising colours the regexp cannot; made
   * on the first colour that needs it, so a page never pays for it otherwise.
   * @returns {CanvasRenderingContext2D} The scratch context.
   */
  static scratchContext() {
    if (!RasterEntity.scratch) {
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      RasterEntity.scratch = canvas.getContext('2d');
    }
    return RasterEntity.scratch;
  } // scratchContext

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Width in logical pixels.
   * @param {number} height - Height in logical pixels.
   * @param {string|false} [penColor] - Passed to AbstractEntity; false by default.
   * @param {string|false} [bkColor] - The same.
   */
  constructor(parentEntity, x, y, width, height, penColor, bkColor) {
    super(parentEntity, x, y, width, height,
          penColor === undefined ? false : penColor,
          bkColor === undefined ? false : bkColor);
    this.id = 'RasterEntity';

    /** the RGBA bytes of one frame; made on the first paint, kept afterwards */
    this.imageData = null;
    /** a Uint32Array view over the same bytes, made on demand */
    this.pixels32 = null;
    /**
     * Whether to repaint when the machine's FLASH phase turns over. A screen
     * with flashing cells sets it and reads `flashState` in paintRaster; one
     * without it saves the check.
     */
    this.watchFlash = false;
    /** the FLASH phase the cache was painted in */
    this.flashState = false;
  } // constructor

  init() {
    super.init();
    if (!this.drawingCache[0]) {
      this.app.layout.newDrawingCache(this, 0);
    }
  } // init

  /**
   * Marks the picture as out of date, so the next draw paints it again. Call
   * it after changing anything {@link RasterEntity#paintRaster} reads.
   */
  invalidate() {
    this.cleanCache();
  } // invalidate

  cleanCache() {
    if (this.drawingCache[0]) {
      this.drawingCache[0].cleanCache();
    }
  } // cleanCache

  /**
   * The `Uint32Array` view over the current frame's bytes — one element per
   * pixel, packed by {@link RasterEntity.rgbaValue}. Only valid inside
   * {@link RasterEntity#paintRaster}, because the bytes are made on the first
   * paint and replaced whenever the entity changes size.
   * @returns {Uint32Array|null} The view, or null before the first paint.
   */
  get pixels() {
    if (this.pixels32 === null && this.imageData !== null) {
      this.pixels32 = new Uint32Array(this.imageData.data.buffer);
    }
    return this.pixels32;
  } // pixels

  /**
   * The `ImageData` of one frame, made on the first call and remade when the
   * entity changes size; {@link RasterEntity#pixels} follows it. An entity with
   * several caches — one per animation frame, as {@link SpriteEntity} — paints
   * them all through this one buffer, because `putImageData` copies.
   * @param {DrawingCache} cache - The cache the frame is going to be put into.
   * @returns {ImageData} The frame's bytes, width × height × 4.
   */
  frameBytes(cache, width, height) {
    var w = width === undefined ? this.width : width;
    var h = height === undefined ? this.height : height;
    if (this.imageData === null || this.imageData.width != w || this.imageData.height != h) {
      this.imageData = cache.ctx.createImageData(w, h);
      this.pixels32 = null;
    }
    return this.imageData;
  } // frameBytes

  /**
   * Fills a rectangle of the current frame with a colour, clipped to the frame —
   * what `DrawingCache.paint()` does with `fillRect`, done on the bytes. Text
   * glyphs are lists of such rectangles, so this is how the text entities
   * paint. Only valid inside a paint, after {@link RasterEntity#frameBytes}.
   * @param {number} x - Left edge, may be negative.
   * @param {number} y - Top edge, may be negative.
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @param {string|false} color - Any CSS colour; false paints nothing.
   */
  paintRect(x, y, width, height, color) {
    if (color === false || color === undefined) {
      return;
    }
    // a negative size runs the other way, as it does for fillRect
    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }
    var frame = this.imageData;
    var x0 = Math.max(0, x), y0 = Math.max(0, y);
    var x1 = Math.min(frame.width, x+width), y1 = Math.min(frame.height, y+height);
    if (x0 >= x1 || y0 >= y1) {
      return;
    }
    var px = this.pixels;
    var value = RasterEntity.colorValue(color);
    for (var row = y0; row < y1; row++) {
      px.fill(value, row*frame.width+x0, row*frame.width+x1);
    }
  } // paintRect

  /**
   * Paints what AbstractEntity paints for every entity — the background in
   * `bkColor`, or the hover/click colour while the pointer is on it — straight
   * onto the main canvas, under the raster. Separate from
   * {@link RasterEntity#drawEntity} so that an entity with its own draw order
   * (text with crop, a sprite with many caches) can still have it.
   */
  paintBackground() {
    super.drawEntity();
  } // paintBackground

  /**
   * Enables crop-to-parent rendering: a second cache the visible part of the
   * frame is copied into when the entity reaches past its parent. See
   * {@link RasterEntity#blitCache}.
   */
  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  /**
   * Disables crop-to-parent rendering by discarding the crop cache.
   */
  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  /**
   * Whether crop-to-parent rendering is on — the question an owner asks before
   * switching it off once the entity has come fully into view.
   * @returns {boolean} True while the entity is drawn through the crop cache.
   */
  paintsWithVisibility() {
    return this.drawingCropCache !== null;
  } // paintsWithVisibility

  /**
   * Blits one cache to the screen — whole, or, with crop-to-parent enabled and
   * the entity reaching past its parent, only the part inside the parent. The
   * crop arithmetic was the same in every entity that had it; it lives here now.
   * @param {number} [index] - The cache to blit, 0 by default.
   */
  blitCache(index) {
    var i = index || 0;
    if (this.drawingCropCache == null
        || ((this.x-this.parentCoverX >= 0) && (this.y-this.parentCoverY >= 0)
            && (this.x+this.width-1 <= this.parentWidth) && (this.y+this.height-1 <= this.parentHeight))) {
      this.app.layout.paintCache(this, i);
      return;
    }
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
    this.app.layout.paintCropCache(this, i, -cropX, -cropY, -cropX, -cropY);
  } // blitCache

  /**
   * Fills the frame. The base version does nothing; a game overrides it and
   * writes width × height RGBA pixels — through the bytes it is given, or
   * through {@link RasterEntity#pixels}.
   *
   * It runs only when the cache is dirty, so composing a whole screen costs
   * nothing on the frames where nothing changed.
   * @param {Uint8ClampedArray} data - The RGBA bytes, 4 per pixel.
   */
  paintRaster(data) {
  } // paintRaster

  /**
   * Paints the frame into the cache when it is dirty — once per game frame,
   * not once per display frame — and blits the cache.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.watchFlash && this.stack.flashState !== this.flashState) {
      this.flashState = this.stack.flashState;
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(this.width, this.height)) {
      var frame = this.frameBytes(cache);
      this.paintRaster(frame.data);
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.blitCache(0);
    this.drawSubEntities();
  } // drawEntity

} // RasterEntity

/** CSS colour string -> packed pixel value, filled by RasterEntity.colorValue() */
RasterEntity.colorValues = new Map();
