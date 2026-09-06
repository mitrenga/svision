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
 * when a whole pixel at a time is easier than four bytes.
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
    this.app.layout.newDrawingCache(this, 0);
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
    if (this.watchFlash && this.stack.flashState !== this.flashState) {
      this.flashState = this.stack.flashState;
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(this.width, this.height)) {
      if (this.imageData === null || this.imageData.width != this.width
          || this.imageData.height != this.height) {
        this.imageData = cache.ctx.createImageData(this.width, this.height);
        this.pixels32 = null;
      }
      this.paintRaster(this.imageData.data);
      cache.ctx.putImageData(this.imageData, 0, 0);
    }
    this.app.layout.paintCache(this, 0);
    this.drawSubEntities();
  } // drawEntity

} // RasterEntity
